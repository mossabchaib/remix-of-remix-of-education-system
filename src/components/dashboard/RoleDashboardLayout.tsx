import type { ReactNode, ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart3, Bell, BookOpen, ClipboardList, Compass, DollarSign, FileVideo,
  GraduationCap, LayoutDashboard, LifeBuoy, ListChecks, LogOut, Award,
  Plus, TrendingUp, UploadCloud,
  UserCircle, Users, Video, Calendar, FileText, Heart, ShoppingBag,
} from "lucide-react";
import { useReminders } from "@/hooks/useReminders";
import { useNotifications } from "@/hooks/useNotifications";
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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { clearSession, getSession } from "@/lib/auth";

type NavItem = { label: string; icon: ComponentType<{ className?: string }>; to: string };

const getTeacherNav = (t: (key: string) => string): NavItem[] => [
  { label: t("dashboard_common.overview"), icon: LayoutDashboard, to: "/dashboard/teacher" },
  { label: t("teacher.myCourses"), icon: BookOpen, to: "/dashboard/teacher/courses" },
  { label: t("teacher.createCourse"), icon: Plus, to: "/dashboard/teacher/courses/new" },
  { label: t("teacher.lessonsNav"), icon: FileVideo, to: "/dashboard/teacher/lessons" },
  { label: t("teacher.uploads"), icon: UploadCloud, to: "/dashboard/teacher/uploads" },
  { label: t("teacher.quizzes"), icon: ListChecks, to: "/dashboard/teacher/quizzes" },
  { label: t("teacher.liveSessions"), icon: Video, to: "/dashboard/teacher/live" },
  { label: t("teacher.studentsNav"), icon: Users, to: "/dashboard/teacher/students" },
  { label: t("teacher.studentProgress"), icon: TrendingUp, to: "/dashboard/teacher/progress" },
  { label: t("teacher.analytics"), icon: BarChart3, to: "/dashboard/teacher/analytics" },
  { label: t("teacher.revenue"), icon: DollarSign, to: "/dashboard/teacher/revenue" },
  { label: t("common.notifications"), icon: Bell, to: "/dashboard/teacher/notifications" },
];

const getStudentNav = (t: (key: string) => string): NavItem[] => [
  { label: t("dashboard_common.overview"), icon: LayoutDashboard, to: "/dashboard/student" },
  { label: t("student.myCourses"), icon: BookOpen, to: "/dashboard/student/courses" },
  { label: t("student.resources"), icon: FileText, to: "/dashboard/student/resources" },
  { label: t("student.quizzes"), icon: ListChecks, to: "/dashboard/student/quizzes" },
  { label: t("student.liveClasses"), icon: Video, to: "/dashboard/student/live" },
  { label: t("student.progress"), icon: TrendingUp, to: "/dashboard/student/progress" },
  { label: t("student.certificates"), icon: Award, to: "/dashboard/student/certificates" },
  { label: t("student.wishlist"), icon: Heart, to: "/dashboard/student/wishlist" },
  { label: t("student.myOrders"), icon: ShoppingBag, to: "/dashboard/student/orders" },
  { label: t("common.notifications"), icon: Bell, to: "/dashboard/student/notifications" },
  { label: t("student.discover"), icon: Compass, to: "/courses" },
];

const accountNav = (role: "teacher" | "student", t: (key: string) => string): NavItem[] => {
  const base: NavItem[] = [
    { label: t("common.profile"), icon: UserCircle, to: `/dashboard/${role}/profile` },
  ];
  if (role === "teacher") base.push({ label: t("teacher.helpSupport"), icon: LifeBuoy, to: `/dashboard/teacher/help` });
  return base;
};




export function RoleDashboardLayout({
  role,
  children,
}: {
  role: "teacher" | "student";
  children: ReactNode;
}) {
  useReminders();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const nav = role === "teacher" ? getTeacherNav(t) : getStudentNav(t);
  const account = accountNav(role, t);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const session = getSession();
  const displayName = session?.name ?? (role === "teacher" ? t("teacher.instructor") : t("student.learner"));
  const { unread } = useNotifications();

  const isActive = (to: string) => {
    if (to === `/dashboard/${role}`) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar side={isRTL ? "right" : "left"} collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold">{t("common.lumen")}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">{role === "teacher" ? t("teacher.workspace") : t("student.workspace")}</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{t("dashboard_common.workspace")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((n) => (
                    <SidebarMenuItem key={n.to + n.label}>
                      <SidebarMenuButton asChild isActive={isActive(n.to)} tooltip={n.label}>
                        <Link to={n.to as string} className="flex items-center gap-2">
                          <n.icon className="h-4 w-4" />
                          <span>{n.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{t("dashboard_common.account")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {account.map((n) => (
                    <SidebarMenuItem key={n.to}>
                      <SidebarMenuButton asChild isActive={isActive(n.to)} tooltip={n.label}>
                        <Link to={n.to as string} className="flex items-center gap-2">
                          <n.icon className="h-4 w-4" /> <span>{n.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
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

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-lg">
            <SidebarTrigger className={isRTL ? "rotate-180" : ""} />
            <div className="ms-auto flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link to={`/dashboard/${role}/notifications` as string} aria-label={t("common.notifications")}>
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-start sm:block">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role}</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 space-y-6 p-6 md:p-10">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
