import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

import { agencyApiRequest } from "@/lib/agency-api";
import { toastApiError } from "@/lib/toast-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = { current_password: "", new_password: "", new_password_confirmation: "" };

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: () => agencyApiRequest("/agency/password", { method: "PUT", body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success("Password updated successfully.");
      setForm(emptyForm);
      setErrors({});
      onOpenChange(false);
    },
    onError: (err: any) => {
      setErrors(err?.fields || {});
      toastApiError(err, "Failed to update password.");
    },
  });

  const canSubmit =
    !!form.current_password &&
    form.new_password.length >= 6 &&
    form.new_password === form.new_password_confirmation;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setForm(emptyForm);
          setErrors({});
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={form.current_password}
              onChange={(e) => set("current_password")(e.target.value)}
            />
            {errors.current_password && <p className="mt-1 text-xs text-destructive">{errors.current_password}</p>}
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={form.new_password}
              onChange={(e) => set("new_password")(e.target.value)}
              placeholder="At least 6 characters"
            />
            {errors.new_password && <p className="mt-1 text-xs text-destructive">{errors.new_password}</p>}
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={form.new_password_confirmation}
              onChange={(e) => set("new_password_confirmation")(e.target.value)}
            />
            {form.new_password_confirmation && form.new_password !== form.new_password_confirmation && (
              <p className="mt-1 text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="gradient-primary"
            onClick={() => saveMutation.mutate()}
            disabled={!canSubmit || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-1.5 h-4 w-4" />
            )}
            Update Password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
