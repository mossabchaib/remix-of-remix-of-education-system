import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Printer, GraduationCap } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/StatusPill";
import { getOrder } from "@/lib/lms-storage";

export const Route = createFileRoute("/orders/$id/receipt")({
  head: () => ({ meta: [{ title: "Receipt — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Receipt,
});

function Receipt() {
  const { id } = Route.useParams();
  const order = typeof window !== "undefined" ? getOrder(id) : undefined;
  if (!order) throw notFound();
  const subtotal = order.amount / 1.08;
  const tax = order.amount - subtotal;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/student/orders"><ArrowLeft className="mr-1.5 h-4 w-4" /> My orders</Link>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>

        <Card className="border-border/60 p-8 shadow-card">
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <p className="text-lg font-semibold">Lumen</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Lumen Learning Inc.<br/>123 Study Ave · Remote</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Invoice</p>
              <p className="font-mono text-sm">{order.invoice}</p>
              <p className="mt-2 text-xs text-muted-foreground">Date: {order.date}</p>
              <StatusPill value={order.status === "paid" ? "Paid" : order.status === "failed" ? "Failed" : "Pending"} />
            </div>
          </div>

          <div className="grid gap-6 py-6 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Billed to</p>
              <p className="mt-1 font-medium">{order.buyerName}</p>
              <p className="text-muted-foreground">{order.buyerEmail}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment</p>
              <p className="mt-1 font-medium">{order.method}{order.cardLast4 ? ` •••• ${order.cardLast4}` : ""}</p>
              <p className="text-muted-foreground font-mono text-xs">{order.txId}</p>
            </div>
          </div>

          <table className="w-full border-t border-border/60 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3">Description</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/60">
                <td className="py-3">
                  <p className="font-medium">{order.courseTitle}</p>
                  <p className="text-xs text-muted-foreground">Instructor: {order.teacher}</p>
                </td>
                <td className="py-3 text-right">${subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <dl className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
            <div className="flex items-center justify-between text-muted-foreground"><dt>Subtotal</dt><dd>${subtotal.toFixed(2)}</dd></div>
            <div className="flex items-center justify-between text-muted-foreground"><dt>Tax</dt><dd>${tax.toFixed(2)}</dd></div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-base font-semibold">
              <dt>Total</dt><dd>${order.amount.toFixed(2)}</dd>
            </div>
          </dl>

          <p className="mt-6 text-xs text-muted-foreground">
            This is a simulated receipt generated for demonstration purposes. No actual charge was made.
          </p>
        </Card>
      </section>
    </SiteLayout>
  );
}
