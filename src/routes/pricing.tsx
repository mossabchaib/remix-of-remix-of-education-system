import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lumen" },
      { name: "description", content: "Simple, transparent pricing for individuals, teams, and enterprises." },
      { property: "og:title", content: "Pricing — Lumen" },
      { property: "og:description", content: "Simple, transparent pricing for individuals, teams, and enterprises." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const { t } = useTranslation();

  const plans = [
    {
      name: t("pricing.starterName"), price: 0, subtitle: t("pricing.starterSubtitle"),
      features: [
        t("pricing.starterFeature1"),
        t("pricing.starterFeature2"),
        t("pricing.starterFeature3"),
        t("pricing.starterFeature4"),
      ],
      cta: t("common.getStarted"),
    },
    {
      name: t("pricing.proName"), price: 19, subtitle: t("pricing.proSubtitle"), popular: true,
      features: [
        t("pricing.proFeature1"),
        t("pricing.proFeature2"),
        t("pricing.proFeature3"),
        t("pricing.proFeature4"),
        t("pricing.proFeature5"),
      ],
      cta: t("pricing.startFreeTrial"),
    },
    {
      name: t("pricing.teamName"), price: 49, subtitle: t("pricing.teamSubtitle"),
      features: [
        t("pricing.teamFeature1"),
        t("pricing.teamFeature2"),
        t("pricing.teamFeature3"),
        t("pricing.teamFeature4"),
        t("pricing.teamFeature5"),
      ],
      cta: t("pricing.contactSales"),
    },
  ];

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <Badge variant="secondary" className="mb-4"><Sparkles className="me-1.5 h-3.5 w-3.5 text-primary" /> {t("pricing.badge")}</Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("pricing.heroTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("pricing.heroSubtitle")}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.name} className={cn(
                "relative border-border/60 p-8 shadow-card transition",
                p.popular && "border-primary/50 shadow-elegant lg:-translate-y-2",
              )}>
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-brand text-primary-foreground">{t("pricing.mostPopular")}</Badge>
                )}
                <p className="text-sm font-semibold text-primary">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.subtitle}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">${p.price}</span>
                  <span className="text-sm text-muted-foreground">{t("common.perMonth")}</span>
                </div>
                <Button asChild className={cn("mt-6 w-full", !p.popular && "bg-foreground text-background hover:bg-foreground/90")}>
                  <Link to="/register">{p.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary-soft text-primary"><Check className="h-3 w-3" /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-border/60 bg-muted/30 p-8 sm:p-12">
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{t("pricing.enterpriseTitle")}</h3>
                <p className="mt-2 text-muted-foreground">{t("pricing.enterpriseDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
