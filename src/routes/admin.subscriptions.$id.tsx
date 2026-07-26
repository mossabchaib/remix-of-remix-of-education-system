import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, Calendar, User, Check } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { subscriptions } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/subscriptions/$id")({
  loader: ({ params }) => {
    const sub = subscriptions.find((s) => s.id === params.id);
    if (!sub) throw notFound();
    return { sub };
  },
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Subscription not found</h1>
      <Button asChild className="mt-4"><Link to="/admin/subscriptions">Back</Link></Button>
    </div>
  ),
  component: SubDetail,
});

const planFeatures: Record<string, string[]> = {
  Free: ["20+ free courses", "Community access", "Basic progress tracking"],
  Pro: ["Unlimited courses", "Certificates", "Downloadable resources", "Priority support"],
  Team: ["Everything in Pro", "Up to 25 seats", "Team analytics", "SSO (Google)"],
  Enterprise: ["Everything in Team", "Custom SLAs", "SAML SSO / SCIM", "Dedicated infra"],
};

function SubDetail() {
  const { sub } = Route.useLoaderData();
  const features = planFeatures[sub.plan] ?? [];

  return (
    <>
      <PageHeader
        title="Subscription details"
        description="Read-only view of subscription information."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/subscriptions"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="border-border/60 p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{sub.plan}</Badge>
            <StatusPill value={sub.status} />
          </div>
          <h2 className="text-xl font-semibold">{sub.user}</h2>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <Field icon={User} label="Customer" value={sub.user} />
            <Field icon={CreditCard} label="Plan" value={sub.plan} />
            <Field icon={CreditCard} label="Amount" value={`$${sub.amount} / month`} />
            <Field icon={Calendar} label="Renews on" value={sub.renewsAt} />
            <Field icon={Calendar} label="Subscription ID" value={sub.id} mono />
          </dl>
        </Card>
        <Card className="border-border/60 p-6 shadow-card">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plan features</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Field({ icon: Icon, label, value, mono }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={mono ? "font-mono text-xs" : "text-sm font-medium"}>{value}</dd>
      </div>
    </div>
  );
}
