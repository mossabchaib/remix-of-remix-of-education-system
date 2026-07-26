import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, User, BookOpen, GraduationCap, CreditCard, DollarSign, Calendar, Hash, Receipt } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { payments, courses } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/payments/$id")({
  loader: ({ params }) => {
    const idx = payments.findIndex((p) => p.id === params.id);
    if (idx === -1) throw notFound();
    const p = payments[idx];
    const course = courses[idx % courses.length];
    const cardNumbers = ["4242", "1881", "9773", "3005"];
    const methodDetail = p.method === "Card"
      ? `Visa •••• ${cardNumbers[idx % cardNumbers.length]}`
      : p.method === "PayPal"
        ? `PayPal · ${p.user.toLowerCase().replace(/\s+/g, ".")}@example.com`
        : "Bank transfer · ACH";
    const txId = `txn_${p.invoice.replace("INV-", "")}${(idx * 137).toString(36).toUpperCase()}`;
    return { p, course, methodDetail, txId };
  },
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Payment not found</h1>
      <Button asChild className="mt-4"><Link to="/admin/payments">Back</Link></Button>
    </div>
  ),
  component: PaymentDetail,
});

function PaymentDetail() {
  const { p, course, methodDetail, txId } = Route.useLoaderData();

  const fields = [
    { icon: Hash, label: "Payment ID", value: p.invoice, mono: true },
    { icon: User, label: "Student", value: p.user },
    { icon: BookOpen, label: "Course", value: course.title },
    { icon: GraduationCap, label: "Teacher", value: course.teacher },
    { icon: DollarSign, label: "Amount", value: `$${p.amount.toFixed(2)}` },
    { icon: Calendar, label: "Payment date", value: p.date },
    { icon: CreditCard, label: "Payment method", value: methodDetail },
    { icon: Receipt, label: "Transaction ID", value: txId, mono: true },
  ];

  return (
    <>
      <PageHeader
        title="Payment details"
        description="Read-only view of transaction information."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/payments"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        }
      />
      <Card className="border-border/60 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Invoice</p>
            <p className="font-mono text-lg font-semibold">{p.invoice}</p>
          </div>
          <StatusPill value={p.status} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <Card key={f.label} className="border-border/60 p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className={f.mono ? "truncate font-mono text-xs" : "truncate text-sm font-medium"}>{f.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Transaction summary</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <Row label="Subtotal" value={`$${p.amount.toFixed(2)}`} />
          <Row label="Tax" value="$0.00" />
          <Row label="Total charged" value={`$${p.amount.toFixed(2)}`} strong />
        </dl>
      </Card>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={"flex items-center justify-between border-b border-border/40 pb-2 last:border-0 " + (strong ? "text-base font-semibold" : "")}>
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
