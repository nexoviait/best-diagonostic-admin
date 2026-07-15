import ctypes
from ctypes import CDLL, c_int, c_void_p, byref, c_uint, POINTER, c_ubyte
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import io
import os
import base64
import threading
import time
from PIL import Image

# Global state
last_scanned_image = None
last_scanned_time = 0
is_device_open = False
device_error = "Initializing scanner..."
stop_event = threading.Event()
lib = None

# Load ZKFinger SDK DLL from Windows System32
try:
    lib = ctypes.CDLL('libzkfp.dll')
    print("Successfully loaded libzkfp.dll from System32.")
    
    # Declare C function signatures
    lib.ZKFPM_Init.restype = c_int
    lib.ZKFPM_Init.argtypes = []
    
    lib.ZKFPM_Terminate.restype = c_int
    lib.ZKFPM_Terminate.argtypes = []
    
    lib.ZKFPM_GetDeviceCount.restype = c_int
    lib.ZKFPM_GetDeviceCount.argtypes = []
    
    lib.ZKFPM_OpenDevice.restype = c_void_p
    lib.ZKFPM_OpenDevice.argtypes = [c_int]
    
    lib.ZKFPM_CloseDevice.restype = c_int
    lib.ZKFPM_CloseDevice.argtypes = [c_void_p]
    
    lib.ZKFPM_GetParameters.restype = c_int
    lib.ZKFPM_GetParameters.argtypes = [c_void_p, c_int, POINTER(c_ubyte), POINTER(c_uint)]
    
    lib.ZKFPM_AcquireFingerprint.restype = c_int
    lib.ZKFPM_AcquireFingerprint.argtypes = [c_void_p, POINTER(c_ubyte), c_uint, POINTER(c_ubyte), POINTER(c_uint)]
except Exception as e:
    print(f"Error loading libzkfp.dll: {e}")
    device_error = "Failed to load SDK DLL (libzkfp.dll). Please ensure ZK4500 drivers are installed."

def device_thread():
    global last_scanned_image, last_scanned_time, is_device_open, device_error
    
    hDevice = None
    width = 0
    height = 0
    img_buffer = None
    
    while not stop_event.is_set():
        if not lib:
            device_error = "SDK DLL not loaded. Cannot run scanner thread."
            time.sleep(2)
            continue
            
        if not is_device_open:
            try:
                ret = lib.ZKFPM_Init()
                if ret != 0 and ret != 1:  # 1 means already initialized
                    device_error = f"SDK initialization failed (Code {ret})."
                    time.sleep(2)
                    continue
                    
                count = lib.ZKFPM_GetDeviceCount()
                if count <= 0:
                    device_error = "ZK4500 fingerprint scanner not detected. Please check the USB connection."
                    try:
                        lib.ZKFPM_Terminate()
                    except:
                        pass
                    time.sleep(2)
                    continue
                    
                hDevice = lib.ZKFPM_OpenDevice(0)
                if not hDevice:
                    device_error = "Failed to open ZK4500 device."
                    try:
                        lib.ZKFPM_Terminate()
                    except:
                        pass
                    time.sleep(2)
                    continue
                    
                # Read device image width (code 1) and height (code 2)
                width_val = (c_ubyte * 4)()
                width_size = c_uint(4)
                lib.ZKFPM_GetParameters(hDevice, 1, width_val, byref(width_size))
                width = int.from_bytes(bytes(width_val[:width_size.value]), byteorder='little')
                
                height_val = (c_ubyte * 4)()
                height_size = c_uint(4)
                lib.ZKFPM_GetParameters(hDevice, 2, height_val, byref(height_size))
                height = int.from_bytes(bytes(height_val[:height_size.value]), byteorder='little')
                
                img_buffer = (c_ubyte * (width * height))()
                is_device_open = True
                device_error = None
                print(f"Successfully connected to ZK4500. Resolution: {width}x{height}")
            except Exception as e:
                device_error = f"Connection error: {e}"
                is_device_open = False
                time.sleep(2)
                continue
                
        # Main polling loop
        try:
            tpl_buffer = (c_ubyte * 2048)()
            tpl_size = c_uint(2048)
            ret = lib.ZKFPM_AcquireFingerprint(hDevice, img_buffer, width * height, tpl_buffer, byref(tpl_size))
            
            if ret == 0:
                print("Fingerprint scanner activity: Scan Successful!")
                # Convert raw grayscale buffer to PNG
                raw_bytes = bytes(img_buffer)
                img = Image.frombytes('L', (width, height), raw_bytes)
                
                # ZK4500 captures the image inverted vertically, flip it so it displays correctly
                img = img.transpose(Image.FLIP_TOP_BOTTOM)
                
                bio = io.BytesIO()
                img.save(bio, format='PNG')
                png_bytes = bio.getvalue()
                base64_str = base64.b64encode(png_bytes).decode('utf-8')
                
                last_scanned_image = base64_str
                last_scanned_time = time.time()
                time.sleep(1.5)  # Cooldown to prevent immediate repeat capture
            elif ret == -3:  # Device disconnected
                print("Scanner disconnected or error encountered.")
                is_device_open = False
                try:
                    lib.ZKFPM_CloseDevice(hDevice)
                except:
                    pass
                try:
                    lib.ZKFPM_Terminate()
                except:
                    pass
                time.sleep(1)
            elif ret != -8:  # Other non-idle error codes
                print(f"Scanner return code: {ret}")
                time.sleep(0.5)
            else:
                # Code -8 means idle (waiting for finger)
                time.sleep(0.05)
        except Exception as e:
            print(f"Error during polling: {e}")
            is_device_open = False
            try:
                lib.ZKFPM_CloseDevice(hDevice)
            except:
                pass
            try:
                lib.ZKFPM_Terminate()
            except:
                pass
            time.sleep(2)

    # Cleanup thread on stop
    if is_device_open and hDevice:
        try:
            lib.ZKFPM_CloseDevice(hDevice)
            lib.ZKFPM_Terminate()
        except:
            pass

class ScannerHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress request logging to keep console clean, unless desired
        pass

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')
        super().end_headers()
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
        
    def do_GET(self):
        global last_scanned_image, last_scanned_time
        
        # Distinguish standard browser ping from actual capture request
        sec_fetch_mode = self.headers.get('Sec-Fetch-Mode', '')
        is_ping = (sec_fetch_mode == 'no-cors') or (self.path == '/')
        
        if is_ping:
            # Respond immediately to pings so the frontend port check succeeds instantly
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            status_data = {
                "status": "ok",
                "device_connected": is_device_open,
                "device_error": device_error,
                "message": "ZK4500 Fingerprint Scanner Service is running."
            }
            self.wfile.write(json.dumps(status_data).encode('utf-8'))
            return
            
        # Actual scan capture request
        if not is_device_open:
            self.send_response(200) # Send 200 with error details as expected by the frontend
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            err_msg = device_error or "Fingerprint scanner not detected."
            self.wfile.write(json.dumps({"error": "disconnected", "message": err_msg}).encode('utf-8'))
            return
            
        # Reset last scanned image to wait for a fresh scan
        last_scanned_image = None
        
        print("Web browser requested a fingerprint scan. Waiting for finger placement...")
        start_wait = time.time()
        captured_data = None
        
        # Wait up to 10 seconds for user to scan their finger
        while time.time() - start_wait < 10.0:
            if last_scanned_image is not None:
                captured_data = last_scanned_image
                break
            time.sleep(0.1)
            
        if captured_data:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response_data = {
                "image": f"data:image/png;base64,{captured_data}"
            }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            print("Successfully sent captured fingerprint image to browser.")
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "timeout",
                "message": "Scan timeout. Please place your finger on the scanner and try again."
            }).encode('utf-8'))
            print("Capture request timed out (10s limit reached).")

def main():
    # Start the hardware background thread
    t = threading.Thread(target=device_thread, daemon=True)
    t.start()
    
    port = 8089
    server_address = ('127.0.0.1', port)
    
    try:
        httpd = HTTPServer(server_address, ScannerHTTPHandler)
        print("="*60)
        print(f" ZK4500 Fingerprint Scanner Web Bridge Service is running.")
        print(f" Listening on: http://127.0.0.1:{port}")
        print(" Keep this window open while using the fingerprint scanner.")
        print("="*60)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down service...")
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        stop_event.set()
        time.sleep(1)

if __name__ == '__main__':
    main()
