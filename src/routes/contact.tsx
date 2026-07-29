import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Lumen" },
      { name: "description", content: "Get in touch with the Lumen team. We usually reply within one business day." },
      { property: "og:title", content: "Contact Lumen" },
      { property: "og:description", content: "Talk to sales, support, or partnerships." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const contactMethods = [
    { icon: Mail, t: t("contact.email"), d: "hello@lumen.school" },
    { icon: Phone, t: t("contact.phone"), d: "+1 (555) 010-1234" },
    { icon: MessageSquare, t: t("contact.liveChat"), d: t("contact.liveChatHours") },
    { icon: MapPin, t: t("contact.studio"), d: "500 Market St, San Francisco" },
  ];

  return (
    <SiteLayout>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("contact.heroTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("contact.heroSubtitle")}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              {contactMethods.map((c) => (
                <Card key={c.t} className="border-border/60 p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                      <c.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.t}</p>
                      <p className="text-sm text-muted-foreground">{c.d}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="border-border/60 p-6 sm:p-8 shadow-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    toast.success(t("common.messageSent"));
                    (e.target as HTMLFormElement).reset();
                  }, 700);
                }}
                className="grid gap-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fn">{t("contact.firstName")}</Label>
                    <Input id="fn" required placeholder="Ada" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ln">{t("contact.lastName")}</Label>
                    <Input id="ln" required placeholder="Lovelace" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="em">{t("contact.workEmail")}</Label>
                  <Input id="em" type="email" required placeholder="ada@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="msg">{t("contact.howHelp")}</Label>
                  <Textarea id="msg" required rows={5} placeholder={t("contact.formPlaceholder")} />
                </div>
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? t("common.sending") : t("common.sendMessage")}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
