// src/routes/auth.reset-password.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { resetPasswordRequest } from "@/services/auth.service";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { AuthShell } from "./login"; // بافتراض وجود هذا المكون

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // استخراج التوكنات
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get("access_token") || "";
  const refreshToken = hash.get("refresh_token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error(t("resetPassword.errorInvalidToken"));
      return;
    }
    
    setLoading(true);
    try {
      await resetPasswordRequest({ accessToken, refreshToken, newPassword: password });
      toast.success(t("resetPassword.successMessage"));
      navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("resetPassword.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-start">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2 shadow-sm ring-1 ring-primary/20">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("resetPassword.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("resetPassword.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("resetPassword.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              required
              className="h-11 rounded-xl bg-muted/30 focus-visible:bg-background transition-all"
              placeholder={t("resetPassword.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <Button type="submit" size="lg" className="w-full h-11 rounded-xl font-semibold shadow-md" disabled={loading}>
            {loading ? t("resetPassword.loading") : t("resetPassword.submitBtn")}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}