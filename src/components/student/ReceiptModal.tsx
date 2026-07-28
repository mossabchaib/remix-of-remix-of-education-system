import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/StatusPill";
import type { Order } from "@/lib/lms-storage";

type ReceiptModalProps = {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TAX_RATE = 0.08;

export function ReceiptModal({ order, open, onOpenChange }: ReceiptModalProps) {
  if (!order) return null;

  // order.amount مخزَّن شاملاً الضريبة — نشتق subtotal/tax للعرض فقط
  const subtotal = order.amount / (1 + TAX_RATE);
  const tax = order.amount - subtotal;

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt · {order.invoice}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <Row label="Order ID" value={<span className="font-mono text-xs">{order.id}</span>} />
          <Row label="Transaction" value={<span className="font-mono text-xs">{order.txId}</span>} />
          <Row label="Course" value={<span className="font-medium">{order.courseTitle}</span>} />
          <Row label="Date" value={order.date.slice(0, 10)} />
          <Row
            label="Method"
            value={order.method + (order.cardLast4 ? ` •••• ${order.cardLast4}` : "")}
          />
          <Row
            label="Status"
            value={
              <StatusPill
                value={order.status === "paid" ? "Paid" : order.status === "failed" ? "Failed" : "Pending"}
              />
            }
          />

          <div className="space-y-1 border-t border-border/60 pt-3">
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} muted />
            <Row label="Tax (8%)" value={`$${tax.toFixed(2)}`} muted />
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total</span>
              <span>${order.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}