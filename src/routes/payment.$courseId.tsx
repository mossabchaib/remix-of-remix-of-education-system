import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { courses } from "@/lib/mock-data";
import {
  addOrder, clearCheckout, generateInvoice, generateOrderId, generateTxId,
  getEnrollments, setCheckout, setEnrollments,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/payment/$courseId")({
  loader: ({ params }) => {
    const course = courses.find((c) => c.id === params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: () => ({
    meta: [
      { title: "Payment — Lumen" },
      { name: "description", content: "Complete your purchase securely." },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Course not found</h1>
        <Button asChild className="mt-6"><Link to="/courses">Back to courses</Link></Button>
      </div>
    </SiteLayout>
  ),
  component: PaymentPage,
});

function PaymentPage() {
  const { course } = Route.useLoaderData();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"Card" | "PayPal">("Card");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("learner@example.com");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/29");
  const [cvc, setCvc] = useState("123");
  const [processing, setProcessing] = useState(false);

  const tax = Math.round(course.price * 0.08 * 100) / 100;
  const total = course.price + tax;

  function finalize(status: "paid" | "failed") {
    const last4 = card.replace(/\s+/g, "").slice(-4);
    const id = generateOrderId();
    addOrder({
      id,
      invoice: generateInvoice(),
      courseId: course.id,
      courseTitle: course.title,
      teacher: course.teacher,
      amount: total,
      status,
      method,
      cardLast4: method === "Card" ? last4 : undefined,
      txId: generateTxId(),
      date: new Date().toISOString().slice(0, 10),
      buyerName: name || "Learner",
      buyerEmail: email,
    });
    if (status === "paid") {
      const cur = getEnrollments();
      if (!cur.includes(course.id)) setEnrollments([...cur, course.id]);
    }
    clearCheckout();
    navigate({
      to: status === "paid" ? "/orders/$id/success" : "/orders/$id/failed",
      params: { id },
    });
  }

  function onPay() {
    setCheckout({ courseId: course.id, method, cardLast4: card.slice(-4), cardName: name });
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      const ok = Math.random() < 0.9;
      if (!ok) toast.error("Payment declined — please try again");
      finalize(ok ? "paid" : "failed");
    }, 900);
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/checkout/$courseId" params={{ courseId: course.id }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to checkout
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Payment</h1>
        <p className="mt-1 text-muted-foreground flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" /> Simulated payment for demo purposes only.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card className="border-border/60 p-6 shadow-card space-y-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment method</h2>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as "Card" | "PayPal")} className="mt-3 grid gap-2 sm:grid-cols-2">
                {(["Card", "PayPal"] as const).map((m) => (
                  <Label key={m} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/40">
                    <RadioGroupItem value={m} />
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{m}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {method === "Card" && (
                <>
                  <div className="space-y-1.5 sm:col-span-2"><Label>Card number</Label><Input value={card} onChange={(e) => setCard(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Expiry</Label><Input value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>CVC</Label><Input value={cvc} onChange={(e) => setCvc(e.target.value)} /></div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" size="lg" onClick={onPay} disabled={processing}>
                {processing ? "Processing…" : `Pay $${total.toFixed(2)}`}
              </Button>
              <Button variant="outline" size="lg" onClick={() => finalize("failed")} disabled={processing}>
                Simulate failure
              </Button>
            </div>
          </Card>

          <Card className="border-border/60 p-6 shadow-card h-fit">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order summary</h2>
            <div className="mt-4 flex items-start gap-3 border-b border-border/60 pb-4">
              <div className="h-12 w-16 shrink-0 rounded-md" style={{ backgroundImage: course.cover }} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{course.title}</p>
                <p className="truncate text-xs text-muted-foreground">{course.teacher}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={`$${course.price.toFixed(2)}`} />
              <Row label="Tax (8%)" value={`$${tax.toFixed(2)}`} />
              <div className="border-t border-border/60 pt-3 flex items-center justify-between text-base font-semibold">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </dl>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-muted-foreground"><dt>{label}</dt><dd>{value}</dd></div>;
}
