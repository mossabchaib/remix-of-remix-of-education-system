import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { dashboardPathForRole, inferRole, setSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Lumen" },
      { name: "description", content: "Sign in to your Lumen account to continue learning." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <AuthShell>
      <p className="text-sm text-muted-foreground">{t("login.welcomeBack")}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("login.signInTitle")}</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setTimeout(() => {
            const role = inferRole(email);
            setSession({ email, name: email.split("@")[0] || "Learner", role });
            toast.success(t("login.welcomeBackToast", { role }));
            navigate({ to: dashboardPathForRole(role) });
          }, 500);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("login.emailLabel")}</Label>
          <Input id="email" type="email" required autoComplete="email"
            placeholder={t("login.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: t("login.emailTip") }} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">{t("login.passwordLabel")}</Label>
            <Link to="/login" className="text-xs text-primary hover:underline">{t("login.forgot")}</Link>
          </div>
          <Input id="pw" type="password" required minLength={4} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? t("login.signingIn") : (<>{t("login.signInBtn")} <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" /></>)}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {t("login.noAccount")} <Link to="/register" className="font-medium text-primary hover:underline">{t("login.createOne")}</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 gradient-brand" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_50%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">Lumen.</span>
          </Link>
          <div>
            <p className="text-3xl font-semibold leading-tight tracking-tight">
              {t("login.testimonial")}
            </p>
            <p className="mt-4 text-sm text-primary-foreground/80">{t("login.testimonialAuthor")}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <Card className="w-full max-w-md border-border/60 p-8 shadow-elegant">{children}</Card>
      </div>
    </div>
  );
}
