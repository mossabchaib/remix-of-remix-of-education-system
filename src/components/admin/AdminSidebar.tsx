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
import { clearSession } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const main = [
    { to: "/admin", label: t("dashboard_common.overview"), icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: t("admin.users"), icon: UserCog },
    // { to: "/admin/students", label: t("admin.students"), icon: Users },
    // { to: "/admin/teachers", label: t("admin.teachers"), icon: GraduationCap },
  ];
  const catalog = [
    { to: "/admin/courses", label: t("admin.courses"), icon: BookOpen },
    { to: "/admin/categories", label: t("admin.categories"), icon: Tags },
  ];
  const billing = [
    { to: "/admin/subscriptions", label: t("admin.subscriptions"), icon: CreditCard },
    // { to: "/admin/payments", label: t("admin.payments"), icon: Receipt },
  ];
  // const insights = [
  //   // { to: "/admin/reports", label: t("admin.reports"), icon: BarChart3 },
  //   // { to: "/admin/announcements", label: t("admin.announcements"), icon: Megaphone },
  //   // { to: "/admin/settings", label: t("admin.settings"), icon: SettingsIcon },
  // ];

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
  <Link to="/" className="flex items-center gap-3 group px-2 py-1.5">
    <span className="relative flex h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl p-0.5 shadow-md shadow-sky-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-sky-500/30">
      <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-background/90 backdrop-blur-sm transition-colors group-hover:bg-background/70">
        <img src="public/logo.png" alt="Logo" className="h-16 w-16 object-contain" />
      </span>
    </span>
    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
      <p className="truncate text-sm font-semibold transition-colors group-hover:text-sky-500">{t("admin.lumenAdmin")}</p>
      <p className="truncate text-xs text-muted-foreground">{t("dashboard_common.workspace")}</p>
    </div>
  </Link>
</SidebarHeader>
      <SidebarContent>
        <Section label={t("dashboard_common.overview")} items={main} />
        <Section label={t("dashboard_common.catalog")} items={catalog} />
        <Section label={t("dashboard_common.billing")} items={billing} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
                              tooltip="Sign out"
                              onClick={() => {
                                clearSession();
                                navigate({ to: "/" });
                              }}
                            >
                              <LogOut className="h-4 w-4" /> <span>{t("common.signOut")}</span>
                            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
