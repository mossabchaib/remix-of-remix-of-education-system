import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { dashboardPathForRole } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — El Manara" },
      { name: "description", content: "Sign in to your El Manara account to continue learning." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthShell>
      <p className="text-sm text-muted-foreground">{t("login.welcomeBack")}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("login.signInTitle")}</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const session = await login(email, password);
            toast.success(t("login.welcomeBackToast", { role: session.role }));
            navigate({ to: dashboardPathForRole(session.role) });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t("login.errorGeneric"));
          }
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
          <Input id="pw" type="password" required minLength={4} autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
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

        {/* Illustration: a luminous open book — fits "Lumen", uses only existing white/opacity tokens */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 400 400"
            className="h-[62%] w-[62%] opacity-90"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* soft glow */}
            <circle cx="200" cy="190" r="150" fill="white" fillOpacity="0.06" />
            <circle cx="200" cy="190" r="95" fill="white" fillOpacity="0.08" />

            {/* light rays */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 200 + Math.cos(angle) * 100;
              const y1 = 150 + Math.sin(angle) * 100;
              const x2 = 200 + Math.cos(angle) * 150;
              const y2 = 150 + Math.sin(angle) * 150;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="white"
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}

            {/* orbit ring */}
            <ellipse
              cx="200"
              cy="230"
              rx="130"
              ry="34"
              stroke="white"
              strokeOpacity="0.3"
              strokeWidth="1"
            />

            {/* open book */}
            <g transform="translate(200 235)">
              {/* spine shadow */}
              <path d="M0 -8 L0 22" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
              {/* left page */}
              <path
                d="M0 -8 C -35 -22 -78 -18 -100 -4 C -100 8 -100 16 -100 24 C -78 10 -35 6 0 22 Z"
                fill="white"
                fillOpacity="0.14"
                stroke="white"
                strokeOpacity="0.55"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              {/* right page */}
              <path
                d="M0 -8 C 35 -22 78 -18 100 -4 C 100 8 100 16 100 24 C 78 10 35 6 0 22 Z"
                fill="white"
                fillOpacity="0.14"
                stroke="white"
                strokeOpacity="0.55"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              {/* page lines - left */}
              <path d="M-16 -12 C -45 -21 -72 -18 -90 -8" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" fill="none" />
              <path d="M-16 -2 C -45 -11 -72 -8 -90 2" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" fill="none" />
              <path d="M-16 8 C -45 -1 -72 2 -90 12" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" fill="none" />
              {/* page lines - right */}
              <path d="M16 -12 C 45 -21 72 -18 90 -8" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" fill="none" />
              <path d="M16 -2 C 45 -11 72 -8 90 2" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" fill="none" />
              <path d="M16 8 C 45 -1 72 2 90 12" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" fill="none" />
            </g>

            {/* floating sparkle particles */}
            <circle cx="90" cy="90" r="2.5" fill="white" fillOpacity="0.7" />
            <circle cx="310" cy="110" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="330" cy="230" r="2.5" fill="white" fillOpacity="0.6" />
            <circle cx="70" cy="260" r="2" fill="white" fillOpacity="0.5" />
            <circle cx="150" cy="70" r="1.5" fill="white" fillOpacity="0.55" />
            <circle cx="255" cy="65" r="1.5" fill="white" fillOpacity="0.5" />
            <path d="M60 150 l4 0 M62 148 l0 4" stroke="white" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
            <path d="M345 175 l5 0 M347.5 172.5 l0 5" stroke="white" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-primary-foreground">
         <Link to="/" className="flex items-center gap-2">
   <span className="relative flex h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl p-0.5 shadow-md shadow-sky-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-sky-500/30">
      <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-background/90 backdrop-blur-sm transition-colors group-hover:bg-background/70">
       <img src="public/logo.png" alt="El Manara Logo" className="h-16 w-16 object-contain" />
      </span>
    </span>
  <span className="text-lg font-semibold">El Manara.</span>
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