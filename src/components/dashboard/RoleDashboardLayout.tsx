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

type NavSection = {
  title: string;
  items: { label: string; icon: ComponentType<{ className?: string }>; to: string }[];
};

const getTeacherNav = (t: (key: string) => string): NavSection[] => [
  {
    title: t("dashboard_common.overview") || "Overview",
    items: [
      { label: t("dashboard_common.overview"), icon: LayoutDashboard, to: "/dashboard/teacher" },
      { label: t("teacher.myCourses"), icon: BookOpen, to: "/dashboard/teacher/courses" },
    ],
  },
  {
    title: t("sidebar.teacher.contentManagement") || "Content Management",
    items: [
      { label: t("teacher.createCourse"), icon: Plus, to: "/dashboard/teacher/courses/new" },
      { label: t("teacher.lessonsNav"), icon: FileVideo, to: "/dashboard/teacher/lessons" },
    ],
  },
  {
    title: t("sidebar.teacher.mediaAndUploads") || "Media & Uploads",
    items: [
      { label: t("teacher.uploads"), icon: UploadCloud, to: "/dashboard/teacher/uploads" },
      { label: t("teacher.quizzes"), icon: ListChecks, to: "/dashboard/teacher/quizzes" },
    ],
  },
  {
    title: t("sidebar.teacher.engagement") || "Live & Performance",
    items: [
      { label: t("teacher.liveSessions"), icon: Video, to: "/dashboard/teacher/live" },
      { label: t("teacher.studentProgress"), icon: TrendingUp, to: "/dashboard/teacher/progress" },
    ],
  },
];

const getStudentNav = (t: (key: string) => string): NavSection[] => [
  {
    title: t("dashboard_common.overview") || "Overview",
    items: [
      { label: t("dashboard_common.overview"), icon: LayoutDashboard, to: "/dashboard/student" },
      { label: t("student.myCourses"), icon: BookOpen, to: "/dashboard/student/courses" },
    ],
  },
  {
    title: t("sidebar.student.learningActivity") || "Learning & Quizzes",
    items: [
      { label: t("student.quizzes"), icon: ListChecks, to: "/dashboard/student/quizzes" },
      { label: t("student.liveClasses"), icon: Video, to: "/dashboard/student/live" },
    ],
  },
  {
    title: t("sidebar.student.trackingAndOrders") || "Progress & Orders",
    items: [
      { label: t("student.progress"), icon: TrendingUp, to: "/dashboard/student/progress" },
      { label: t("student.myOrders"), icon: ShoppingBag, to: "/dashboard/student/orders" },
    ],
  },
  {
    title: t("sidebar.student.explore") || "Discovery",
    items: [
      { label: t("student.discover"), icon: Compass, to: "/courses" },
    ],
  },
];

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
  const navSections = role === "teacher" ? getTeacherNav(t) : getStudentNav(t);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const session = getSession();
  const displayName = session?.name ?? (role === "teacher" ? t("teacher.instructor") : t("student.learner"));

  const isActive = (to: string) => {
    if (to === `/dashboard/${role}`) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar side={isRTL ? "right" : "left"} collapsible="icon">
      <SidebarHeader>
  <Link to="/" className="flex items-center gap-3 group px-2 py-1.5">
    <span className="relative flex h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl p-0.5 shadow-md shadow-sky-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-sky-500/30">
      <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-background/90 backdrop-blur-sm transition-colors group-hover:bg-background/70">
       <img src="public/logo.png" alt="El Manara Logo" className="h-16 w-16 object-contain" />
      </span>
    </span>
    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
      <p className="truncate text-sm font-semibold transition-colors group-hover:text-sky-500">{t("common.lumen")}</p>
      <p className="truncate text-xs text-muted-foreground capitalize">
        {role === "teacher" ? t("teacher.workspace") : t("student.workspace")}
      </p>
    </div>
  </Link>
</SidebarHeader>
          
          <SidebarContent>
            {navSections.map((section, idx) => (
              <SidebarGroup key={idx}>
                <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 mb-1">
                  {section.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((n) => (
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
            ))}
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