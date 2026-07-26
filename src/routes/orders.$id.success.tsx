import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, Receipt as ReceiptIcon, BookOpen } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getOrder } from "@/lib/lms-storage";

export const Route = createFileRoute("/orders/$id/success")({
  head: () => ({ meta: [{ title: "Payment successful — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Success,
});

function Success() {
  const { id } = Route.useParams();
  const order = typeof window !== "undefined" ? getOrder(id) : undefined;
  if (!order) throw notFound();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Card className="border-border/60 p-8 shadow-elegant text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Payment successful</h1>
          <p className="mt-1 text-sm text-muted-foreground">You're now enrolled in {order.courseTitle}.</p>

          <dl className="mt-6 grid gap-2 text-sm rounded-lg bg-muted/40 p-4 text-left">
            <Row label="Order ID" value={order.id} mono />
            <Row label="Invoice" value={order.invoice} mono />
            <Row label="Amount" value={`$${order.amount.toFixed(2)}`} />
            <Row label="Method" value={order.method + (order.cardLast4 ? ` •••• ${order.cardLast4}` : "")} />
          </dl>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/dashboard/student/courses/$id" params={{ id: order.courseId }}>
                <BookOpen className="mr-1.5 h-4 w-4" /> Start learning
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/orders/$id/receipt" params={{ id: order.id }}>
                <ReceiptIcon className="mr-1.5 h-4 w-4" /> View receipt
              </Link>
            </Button>
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "font-medium"}>{value}</dd>
    </div>
  );
}
