import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Tags, CreditCard,
  Receipt, BarChart3, Settings as SettingsIcon, UserCog, LogOut, Megaphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const main = [
    { to: "/admin", label: t("dashboard_common.overview"), icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: t("admin.users"), icon: UserCog },
    { to: "/admin/students", label: t("admin.students"), icon: Users },
    { to: "/admin/teachers", label: t("admin.teachers"), icon: GraduationCap },
  ];
  const catalog = [
    { to: "/admin/courses", label: t("admin.courses"), icon: BookOpen },
    { to: "/admin/categories", label: t("admin.categories"), icon: Tags },
  ];
  const billing = [
    { to: "/admin/subscriptions", label: t("admin.subscriptions"), icon: CreditCard },
    { to: "/admin/payments", label: t("admin.payments"), icon: Receipt },
  ];
  const insights = [
    { to: "/admin/reports", label: t("admin.reports"), icon: BarChart3 },
    { to: "/admin/announcements", label: t("admin.announcements"), icon: Megaphone },
    // { to: "/admin/settings", label: t("admin.settings"), icon: SettingsIcon },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const Section = ({ label, items }: { label: string; items: typeof main }) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((i) => (
            <SidebarMenuItem key={i.to}>
              <SidebarMenuButton asChild isActive={isActive(i.to, i.exact)}>
                <Link to={i.to} className="flex items-center gap-2">
                  <i.icon className="h-4 w-4 shrink-0" />
                  <span>{i.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar side={isRTL ? "right" : "left"} collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">{t("admin.lumenAdmin")}</p>
            <p className="truncate text-xs text-muted-foreground">{t("dashboard_common.workspace")}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Section label={t("dashboard_common.overview")} items={main} />
        <Section label={t("dashboard_common.catalog")} items={catalog} />
        <Section label={t("dashboard_common.billing")} items={billing} />
        <Section label={t("dashboard_common.insights")} items={insights} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/" className="flex items-center gap-2">
                <LogOut className="h-4 w-4 shrink-0" />
                <span>{t("dashboard_common.exitAdmin")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
