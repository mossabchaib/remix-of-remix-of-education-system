import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, BookOpen, Receipt as ReceiptIcon, ShoppingBag } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrder } from "@/hooks/Useorder";

export const Route = createFileRoute("/orders/$id/confirmation")({
  head: () => ({ meta: [{ title: "Order confirmation — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Confirmation,
});

function Confirmation() {
  const { id } = Route.useParams();
  const order = useOrder(id);
  if (!order) throw notFound();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Card className="border-border/60 p-8 shadow-elegant">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Order confirmed</h1>
              <p className="text-sm text-muted-foreground">Thanks {order.buyerName} — your enrollment is ready.</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Course</p>
                <p className="text-base font-semibold">{order.courseTitle}</p>
                <p className="text-xs text-muted-foreground">By {order.teacher}</p>
              </div>
              <Badge variant="outline">Enrolled</Badge>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Order ID" value={order.id} mono />
            <Field label="Invoice" value={order.invoice} mono />
            <Field label="Date" value={order.date} />
            <Field label="Amount" value={`$${order.amount.toFixed(2)}`} />
            <Field label="Method" value={order.method + (order.cardLast4 ? ` •••• ${order.cardLast4}` : "")} />
            <Field label="Transaction" value={order.txId} mono />
          </dl>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
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
            <Button asChild variant="ghost">
              <Link to="/dashboard/student/orders">
                <ShoppingBag className="mr-1.5 h-4 w-4" /> My orders
              </Link>
            </Button>
          </div>
        </Card>
      </section>
    </SiteLayout>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "mt-0.5 font-mono text-xs" : "mt-0.5 text-sm font-medium"}>{value}</p>
    </div>
  );
}