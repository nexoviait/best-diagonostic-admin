import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Headset, Loader2, Mail, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { apiRequest } from "@/lib/api";
import { toastApiError } from "@/lib/toast-error";
import { useFieldErrors } from "@/lib/use-field-errors";

interface AppSettings {
  brevo_api_key_set: boolean;
  brevo_api_key_hint: string | null;
  mail_sender_email: string | null;
  mail_sender_name: string | null;
  it_helpdesk_phone: string | null;
  it_helpdesk_email: string | null;
}

/**
 * E-mail provider (Brevo) and IT helpdesk contact for the mobile app. Saved separately from the
 * account form above because these are system-wide settings, not part of the admin's profile.
 */
export function AppSettingsCard() {
  const queryClient = useQueryClient();
  const { fieldErrors, setFromError, clear, clearAll } = useFieldErrors();

  const { data, isLoading } = useQuery<AppSettings>({
    queryKey: ["appSettings"],
    queryFn: () => apiRequest("/app-settings"),
  });

  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [helpdeskPhone, setHelpdeskPhone] = useState("");
  const [helpdeskEmail, setHelpdeskEmail] = useState("");

  useEffect(() => {
    if (!data) return;
    setSenderEmail(data.mail_sender_email || "");
    setSenderName(data.mail_sender_name || "");
    setHelpdeskPhone(data.it_helpdesk_phone || "");
    setHelpdeskEmail(data.it_helpdesk_email || "");
  }, [data]);

  const save = useMutation({
    mutationFn: (extra: Record<string, unknown> = {}) =>
      apiRequest<AppSettings>("/app-settings", {
        method: "PUT",
        body: JSON.stringify({
          // Blank means "keep the stored key" on the server, so it is always safe to send.
          brevo_api_key: apiKey.trim(),
          mail_sender_email: senderEmail.trim(),
          mail_sender_name: senderName.trim(),
          it_helpdesk_phone: helpdeskPhone.trim(),
          it_helpdesk_email: helpdeskEmail.trim(),
          ...extra,
        }),
      }),
    onSuccess: (saved) => {
      toast.success("Email and support settings saved.");
      setApiKey("");
      clearAll();
      queryClient.setQueryData(["appSettings"], saved);
    },
    onError: (err: any) => {
      setFromError(err);
      toastApiError(err, "Failed to save settings.");
    },
  });

  const sendTest = useMutation({
    mutationFn: () => apiRequest<{ message: string }>("/app-settings/test-email", { method: "POST" }),
    onSuccess: (res) => toast.success(res.message),
    // Show Brevo's own explanation here (wrong key, sender not verified...): that is the point of a test.
    onError: (err: any) => toast.error(err?.message || "The test e-mail could not be sent."),
  });

  const keySet = !!data?.brevo_api_key_set;
  const canTest = keySet && !!(data?.mail_sender_email || senderEmail);

  return (
    <div className="card-surface p-6">
      <div className="mb-1 flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h4 className="font-display text-sm font-semibold uppercase tracking-wide">
          Email &amp; Support (Mobile App)
        </h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Staff who forget their password get a 6-digit code by e-mail, sent through{" "}
        <a className="underline" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer">
          Brevo
        </a>
        . The IT helpdesk contact is shown on the mobile app's first screen.
      </p>

      {isLoading ? (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-5">
            <h5 className="text-sm font-semibold">Brevo e-mail</h5>
            <div>
              <Label>API key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  clear("brevo_api_key");
                }}
                placeholder={keySet ? `Saved (${data?.brevo_api_key_hint}). Type to replace.` : "xkeysib-..."}
              />
              <FieldError message={fieldErrors.brevo_api_key} />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Stored encrypted and never shown again. Leave blank to keep the saved key.
              </p>
              {keySet && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-destructive hover:text-destructive"
                  disabled={save.isPending}
                  onClick={() => {
                    if (window.confirm("Remove the saved Brevo API key? Password reset e-mails will stop working.")) {
                      save.mutate({ clear_brevo_api_key: true });
                    }
                  }}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Remove saved key
                </Button>
              )}
            </div>
            <div>
              <Label>Sender e-mail</Label>
              <Input
                type="email"
                value={senderEmail}
                onChange={(e) => {
                  setSenderEmail(e.target.value);
                  clear("mail_sender_email");
                }}
                placeholder="no-reply@yourdomain.com"
              />
              <FieldError message={fieldErrors.mail_sender_email} />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Must be a verified sender in your Brevo account, or Brevo will refuse to send.
              </p>
            </div>
            <div>
              <Label>Sender name</Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="BEST Diagnostic"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-5">
            <h5 className="flex items-center gap-1.5 text-sm font-semibold">
              <Headset className="h-4 w-4" /> IT helpdesk
            </h5>
            <div>
              <Label>Phone</Label>
              <Input
                value={helpdeskPhone}
                onChange={(e) => setHelpdeskPhone(e.target.value)}
                placeholder="+880 1XXX-XXXXXX"
              />
              <FieldError message={fieldErrors.it_helpdesk_phone} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={helpdeskEmail}
                onChange={(e) => {
                  setHelpdeskEmail(e.target.value);
                  clear("it_helpdesk_email");
                }}
                placeholder="it@yourdomain.com"
              />
              <FieldError message={fieldErrors.it_helpdesk_email} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shown as "Contact IT Helpdesk" on the mobile app's role screen. Leave both empty to hide it.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          disabled={!canTest || sendTest.isPending || save.isPending}
          onClick={() => sendTest.mutate()}
          title={canTest ? "Sends a test e-mail to your own account e-mail" : "Save the API key and sender e-mail first"}
        >
          {sendTest.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          Send test e-mail
        </Button>
        <Button className="gradient-primary" disabled={save.isPending || isLoading} onClick={() => save.mutate({})}>
          {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save email &amp; support settings
        </Button>
      </div>
    </div>
  );
}
