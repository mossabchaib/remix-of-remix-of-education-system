import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileImage,
  FileText,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Subscription } from "@/lib/lms-storage";

// Plan → default access days, used to pre-fill the days input
const PLAN_DAYS: Record<string, number> = {
  Monthly: 30,
  Quarterly: 90,
  Yearly: 365,
};

function defaultDaysFor(planName: string) {
  return PLAN_DAYS[planName] ?? 30;
}

function isImageUrl(url?: string) {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif)$/i.test(url) || url.startsWith("data:image");
}

export function SubscriptionReviewDialog({
  open,
  onOpenChange,
  subscription,
  onApprove,
  onReject,
  isProcessing = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  onApprove: (days: number) => Promise<void>;
  onReject: () => Promise<void>;
  /** Optional external busy flag (e.g. set by the parent page) that also blocks the dialog from closing. */
  isProcessing?: boolean;
}) {
  const { t } = useTranslation();

  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const isBusy = busy !== null || isProcessing;

  useEffect(() => {
    if (subscription) setDays(defaultDaysFor(subscription.plan_name));
  }, [subscription]);

  async function handleApprove() {
    if (!subscription) return;
    setBusy("approve");
    try {
      await onApprove(days);
      toast.success(
        t("admin.subscriptions.review.toast.approved", {
          name: subscription.profiles?.full_name ?? t("admin.subscriptions.review.defaultStudentName"),
          days,
        })
      );
    } catch (err: any) {
      toast.error(err?.message || t("admin.subscriptions.review.errors.approveFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    if (!subscription) return;
    setBusy("reject");
    try {
      await onReject();
      toast.success(t("admin.subscriptions.review.toast.rejected"));
    } catch (err: any) {
      toast.error(err?.message || t("admin.subscriptions.review.errors.rejectFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Prevent closing the dialog while an approve/reject request is in flight
        if (!nextOpen && isBusy) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.subscriptions.review.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.subscriptions.review.subtitle", {
              name: subscription?.profiles?.full_name ?? "",
            })}{" "}
            <span className="font-medium text-foreground">
              {subscription?.plan_name}
            </span>{" "}
            · ${Number(subscription?.amount ?? 0).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment proof */}
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
              {t("admin.subscriptions.review.paymentProof")}
            </Label>
            {subscription?.payment_proof_url ? (
              isImageUrl(subscription.payment_proof_url) ? (
                <a
                  href={subscription.payment_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-xl border border-border/60"
                >
                  <img
                    src={subscription.payment_proof_url}
                    alt={t("admin.subscriptions.review.paymentProofAlt")}
                    className="max-h-72 w-full object-contain bg-muted/30"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    <ExternalLink className="h-6 w-6 text-white" />
                  </div>
                </a>
              ) : (
                <a
                  href={subscription.payment_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 hover:bg-muted/50"
                >
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("admin.subscriptions.review.openReceipt")}
                  </span>
                  <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                </a>
              )
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                <FileImage className="h-4 w-4" />
                {t("admin.subscriptions.review.noProof")}
              </div>
            )}
          </div>

          {/* Access duration */}
          {subscription?.status === "pending" && (
            <div>
              <Label
                htmlFor="days"
                className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground"
              >
                {t("admin.subscriptions.review.accessDuration")}
              </Label>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="days"
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  disabled={isBusy}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">
                  {t("admin.subscriptions.review.defaultForPlan", {
                    plan: subscription.plan_name,
                    days: defaultDaysFor(subscription.plan_name),
                  })}
                </span>
              </div>
            </div>
          )}

          {subscription?.status !== "pending" && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {subscription?.reviewed_at
                ? t("admin.subscriptions.review.alreadyReviewedOn", {
                    date: subscription.reviewed_at.slice(0, 10),
                  })
                : t("admin.subscriptions.review.alreadyReviewed")}
            </div>
          )}
        </div>

        {subscription?.status === "pending" && (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isBusy}
              className="text-destructive hover:text-destructive"
            >
              {busy === "reject" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-1.5 h-4 w-4" />
              )}
              {t("admin.subscriptions.review.rejectButton")}
            </Button>
            <Button onClick={handleApprove} disabled={isBusy || days < 1}>
              {busy === "approve" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              {t("admin.subscriptions.review.approveButton", { days })}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}