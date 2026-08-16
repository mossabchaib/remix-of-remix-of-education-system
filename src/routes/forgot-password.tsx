import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { forgotPassword, authErrorMessage } from "@/lib/auth";
import { toast } from "sonner";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset your password — El Manara" }],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(authErrorMessage(err, t("forgotPassword.errorGeneric")));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div className="text-center space-y-4 py-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <MailCheck className="h-8 w-8 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("forgotPassword.checkEmailTitle")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {t("forgotPassword.checkEmailBody", { email })}
            </p>
          </div>
          <div className="pt-2">
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center rounded-xl bg-secondary/50 px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary transition-colors"
            >
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-start">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2 shadow-sm ring-1 ring-primary/20">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("forgotPassword.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("forgotPassword.subtitle")}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("forgotPassword.emailLabel")}
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 rounded-xl bg-muted/30 focus-visible:bg-background transition-all"
              placeholder={t("forgotPassword.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <Button type="submit" size="lg" className="w-full h-11 rounded-xl font-semibold shadow-md transition-all hover:shadow-lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("forgotPassword.sending")}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {t("forgotPassword.sendBtn")} 
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </span>
            )}
          </Button>
        </form>

        <div className="text-center md:text-start pt-2">
          <Link to="/login" className="text-sm font-medium text-primary hover:underline underline-offset-4">
            ← {t("forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}