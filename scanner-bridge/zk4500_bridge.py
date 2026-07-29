php import asyncio
import base64
import ctypes
import io
import json
import os
import sys
import threading
import time
from datetime import datetime

import websockets
from PIL import Image

DLL_PATH = r"C:\Windows\System32\libzkfp.dll"
WS_HOST = "127.0.0.1"
WS_PORT = 8765
POLL_INTERVAL = 0.06
RECONNECT_INTERVAL = 3.0
CAPTURE_COOLDOWN = 2.0
MAX_TEMPLATE_SIZE = 2048
MAX_CONSECUTIVE_HW_ERRORS = 40

BASE_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
os.makedirs(CAPTURES_DIR, exist_ok=True)


class ScannerState:
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    SCANNING = "scanning"
    ERROR = "error"


def load_and_bind_dll():
    dll = ctypes.WinDLL(DLL_PATH)
    dll.ZKFPM_Init.restype = ctypes.c_int
    dll.ZKFPM_Init.argtypes = []
    dll.ZKFPM_Terminate.restype = ctypes.c_int
    dll.ZKFPM_Terminate.argtypes = []
    dll.ZKFPM_GetDeviceCount.restype = ctypes.c_int
    dll.ZKFPM_GetDeviceCount.argtypes = []
    dll.ZKFPM_OpenDevice.restype = ctypes.c_void_p
    dll.ZKFPM_OpenDevice.argtypes = [ctypes.c_int]
    dll.ZKFPM_CloseDevice.restype = ctypes.c_int
    dll.ZKFPM_CloseDevice.argtypes = [ctypes.c_void_p]
    dll.ZKFPM_GetCaptureParamsEx.restype = ctypes.c_int
    dll.ZKFPM_GetCaptureParamsEx.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
    ]
    dll.ZKFPM_AcquireFingerprint.restype = ctypes.c_int
    dll.ZKFPM_AcquireFingerprint.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_ubyte),
        ctypes.c_uint,
        ctypes.POINTER(ctypes.c_ubyte),
        ctypes.POINTER(ctypes.c_uint),
    ]
    dll.ZKFPM_GetTemplateQuality.restype = ctypes.c_int
    dll.ZKFPM_GetTemplateQuality.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_ubyte),
        ctypes.c_uint,
    ]
    return dll


def acquire_once(dll, handle, width, height):
    """Poll once. Returns (ret, image_bytes_or_None, template_bytes_or_None, quality_or_None)."""
    img_size = width * height
    img_buf = (ctypes.c_ubyte * img_size)()
    tmpl_buf = (ctypes.c_ubyte * MAX_TEMPLATE_SIZE)()
    tmpl_len = ctypes.c_uint(MAX_TEMPLATE_SIZE)

    ret = dll.ZKFPM_AcquireFingerprint(handle, img_buf, ctypes.c_uint(img_size), tmpl_buf, ctypes.byref(tmpl_len))

    if ret == 0:
        quality = dll.ZKFPM_GetTemplateQuality(handle, tmpl_buf, ctypes.c_uint(tmpl_len.value))
        return ret, bytes(img_buf), bytes(tmpl_buf[: tmpl_len.value]), quality

    if ret == -9:  # ZKFP_ERR_EXTRACT_FP: finger sensed, template extraction failed
        return ret, bytes(img_buf), None, None

    return ret, None, None, None


def image_to_png_data_url(raw_bytes, width, height):
    im = Image.frombytes("L", (width, height), raw_bytes)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    return data_url, im


def save_capture(im):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    bmp_path = os.path.join(CAPTURES_DIR, f"fp_{ts}.bmp")
    png_path = os.path.join(CAPTURES_DIR, f"fp_{ts}.png")
    im.save(bmp_path, dpi=(500, 500))
    im.save(png_path, dpi=(500, 500))
    return bmp_path, png_path


class Bridge:
    def __init__(self):
        self.clients = set()
        self.armed_clients = set()
        self.status = ScannerState.DISCONNECTED
        self.status_message = ""
        self.loop = None
        self.dll = None
        self._stop = False

    def set_status(self, status, message=""):
        self.status = status
        self.status_message = message
        print(f"[status] {status} {message}", flush=True)
        self._broadcast({"type": "status", "status": status, "message": message})

    def _broadcast(self, message):
        if self.loop is None:
            return
        data = json.dumps(message)
        asyncio.run_coroutine_threadsafe(self._broadcast_async(data), self.loop)

    async def _broadcast_async(self, data):
        dead = []
        for ws in list(self.clients):
            try:
                await ws.send(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)
            self.armed_clients.discard(ws)

    def hardware_loop(self):
        while not self._stop:
            try:
                self._ensure_sdk_ready()
            except Exception as e:
                self.dll = None
                self.set_status(ScannerState.DISCONNECTED, str(e))
                time.sleep(RECONNECT_INTERVAL)
                continue

            self.set_status(ScannerState.CONNECTED, "Idle")

            try:
                self._idle_and_scan_cycle()
            except Exception as e:
                self.set_status(ScannerState.ERROR, str(e))
                time.sleep(RECONNECT_INTERVAL)

    def _ensure_sdk_ready(self):
        if self.dll is None:
            self.set_status(ScannerState.CONNECTING, "Initializing ZK4500 SDK...")
            self.dll = load_and_bind_dll()

        # This device is unreliable with a long-lived SDK/USB session, so we
        # only use a brief Init->probe->Terminate cycle here to confirm the
        # device is present; the real Init happens fresh per scan session.
        ret = self.dll.ZKFPM_Init()
        if ret not in (0, 1):  # 1 = ZKFP_ERR_ALREADY_INIT
            raise RuntimeError(f"ZKFPM_Init failed (ret={ret})")

        try:
            count = self.dll.ZKFPM_GetDeviceCount()
            if count <= 0:
                raise RuntimeError("No ZK4500 device found")

            handle = self.dll.ZKFPM_OpenDevice(0)
            if not handle:
                raise RuntimeError("ZK4500 not responding")
            self.dll.ZKFPM_CloseDevice(handle)
        finally:
            self.dll.ZKFPM_Terminate()

    def _idle_and_scan_cycle(self):
        while not self._stop:
            if not self.armed_clients:
                time.sleep(0.15)
                continue
            self._run_scan_session()

    def _run_scan_session(self):
        # Fresh Init/Terminate per session mirrors the pattern that proved
        # reliable in testing on this device, rather than keeping one SDK
        # context open across long idle gaps between patient entries.
        ret = self.dll.ZKFPM_Init()
        if ret not in (0, 1):
            raise RuntimeError(f"ZKFPM_Init failed (ret={ret})")

        handle = self.dll.ZKFPM_OpenDevice(0)
        if not handle:
            self.dll.ZKFPM_Terminate()
            raise RuntimeError("Failed to open ZK4500 device")

        try:
            w, h, dpi = ctypes.c_int(0), ctypes.c_int(0), ctypes.c_int(0)
            self.dll.ZKFPM_GetCaptureParamsEx(handle, ctypes.byref(w), ctypes.byref(h), ctypes.byref(dpi))
            width, height = w.value, h.value
            if width <= 0 or height <= 0:
                raise RuntimeError("Device returned invalid capture parameters")

            self.set_status(ScannerState.SCANNING, "Waiting for finger...")
            consecutive_hw_errors = 0

            while self.armed_clients and not self._stop:
                ret, img_bytes, tmpl_bytes, quality = acquire_once(self.dll, handle, width, height)

                if ret == 0:
                    consecutive_hw_errors = 0
                    png_data_url, im = image_to_png_data_url(img_bytes, width, height)
                    bmp_path, png_path = save_capture(im)
                    print(f"[capture] quality={quality} template_len={len(tmpl_bytes)}", flush=True)
                    self._broadcast(
                        {
                            "type": "capture",
                            "quality": quality,
                            "template": base64.b64encode(tmpl_bytes).decode("ascii"),
                            "image": png_data_url,
                            "saved_bmp": bmp_path,
                            "saved_png": png_path,
                            "timestamp": datetime.now().isoformat(),
                        }
                    )
                    self.set_status(ScannerState.CONNECTED, "Capture complete")
                    time.sleep(CAPTURE_COOLDOWN)
                    return

                elif ret == -9 and img_bytes:
                    consecutive_hw_errors = 0
                    png_data_url, _ = image_to_png_data_url(img_bytes, width, height)
                    self._broadcast({"type": "preview", "image": png_data_url})

                elif ret == -8:
                    consecutive_hw_errors = 0  # no finger present yet - expected, keep polling

                else:
                    consecutive_hw_errors += 1
                    if consecutive_hw_errors > MAX_CONSECUTIVE_HW_ERRORS:
                        raise RuntimeError(f"Repeated hardware errors (last ret={ret})")

                time.sleep(POLL_INTERVAL)

        finally:
            self.dll.ZKFPM_CloseDevice(handle)
            self.dll.ZKFPM_Terminate()
            if not self.armed_clients:
                self.set_status(ScannerState.CONNECTED, "Idle")

    async def handler(self, websocket):
        self.clients.add(websocket)
        try:
            await websocket.send(
                json.dumps({"type": "status", "status": self.status, "message": self.status_message})
            )
            async for raw in websocket:
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                action = msg.get("action")
                if action == "arm":
                    self.armed_clients.add(websocket)
                elif action == "disarm":
                    self.armed_clients.discard(websocket)
        finally:
            self.clients.discard(websocket)
            self.armed_clients.discard(websocket)

    async def run(self):
        self.loop = asyncio.get_running_loop()
        threading.Thread(target=self.hardware_loop, daemon=True).start()
        async with websockets.serve(self.handler, WS_HOST, WS_PORT):
            print(f"ZK4500 Fingerprint Bridge listening on ws://{WS_HOST}:{WS_PORT}", flush=True)
            print("Keep this window open while using the fingerprint scanner.", flush=True)
            await asyncio.Future()


if __name__ == "__main__":
    bridge = Bridge()
    try:
        asyncio.run(bridge.run())
    except KeyboardInterrupt:
        pass
