import type { ReactNode, ComponentType } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart3, Bell, BookOpen, ClipboardList, Compass, DollarSign, FileVideo,
  GraduationCap, LayoutDashboard, LifeBuoy, ListChecks, LogOut, Award,
  Plus, Settings as SettingsIcon, TrendingUp, UploadCloud,
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

const teacherNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/dashboard/teacher" },
  { label: "My courses", icon: BookOpen, to: "/dashboard/teacher/courses" },
  { label: "Create course", icon: Plus, to: "/dashboard/teacher/courses/new" },
  { label: "Lessons", icon: FileVideo, to: "/dashboard/teacher/lessons" },
  { label: "Uploads", icon: UploadCloud, to: "/dashboard/teacher/uploads" },
  { label: "Quizzes", icon: ListChecks, to: "/dashboard/teacher/quizzes" },
  { label: "Assignments", icon: ClipboardList, to: "/dashboard/teacher/assignments" },
  { label: "Live sessions", icon: Video, to: "/dashboard/teacher/live" },
  { label: "Students", icon: Users, to: "/dashboard/teacher/students" },
  { label: "Student progress", icon: TrendingUp, to: "/dashboard/teacher/progress" },
  { label: "Analytics", icon: BarChart3, to: "/dashboard/teacher/analytics" },
  { label: "Revenue", icon: DollarSign, to: "/dashboard/teacher/revenue" },
  { label: "Notifications", icon: Bell, to: "/dashboard/teacher/notifications" },
];

const studentNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, to: "/dashboard/student" },
  { label: "My courses", icon: BookOpen, to: "/dashboard/student/courses" },
  { label: "Resources", icon: FileText, to: "/dashboard/student/resources" },
  { label: "Quizzes", icon: ListChecks, to: "/dashboard/student/quizzes" },
  { label: "Assignments", icon: ClipboardList, to: "/dashboard/student/assignments" },
  { label: "Live classes", icon: Video, to: "/dashboard/student/live" },
  { label: "Calendar", icon: Calendar, to: "/dashboard/student/calendar" },
  { label: "Progress", icon: TrendingUp, to: "/dashboard/student/progress" },
  { label: "Certificates", icon: Award, to: "/dashboard/student/certificates" },
  { label: "Wishlist", icon: Heart, to: "/dashboard/student/wishlist" },
  { label: "My orders", icon: ShoppingBag, to: "/dashboard/student/orders" },
  { label: "Notifications", icon: Bell, to: "/dashboard/student/notifications" },
  { label: "Discover", icon: Compass, to: "/courses" },
  { label: "Messages", icon: MessageSquare, to: "/dashboard/student" },
];

const accountNav = (role: "teacher" | "student"): NavItem[] => {
  const base: NavItem[] = [
    { label: "Profile", icon: UserCircle, to: `/dashboard/${role}/profile` },
  ];
  if (role === "student") base.push({ label: "Settings", icon: SettingsIcon, to: `/dashboard/${role}/settings` });
  if (role === "teacher") base.push({ label: "Help & support", icon: LifeBuoy, to: `/dashboard/teacher/help` });
  return base;
};

export function RoleDashboardLayout({
  role,
  children,
}: {
  role: "teacher" | "student";
  children: ReactNode;
}) {
  const nav = role === "teacher" ? teacherNav : studentNav;
  const account = accountNav(role);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const session = getSession();
  const displayName = session?.name ?? (role === "teacher" ? "Instructor" : "Learner");

  const isActive = (to: string) => {
    if (to === `/dashboard/${role}`) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold">Lumen</p>
                <p className="truncate text-xs text-muted-foreground capitalize">{role} workspace</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
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
              <SidebarGroupLabel>Account</SidebarGroupLabel>
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
                  <LogOut className="h-4 w-4" /> <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-lg">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              <Button asChild variant="ghost" size="icon">
                <Link to={`/dashboard/${role}/notifications` as string}>
                  <Bell className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-right sm:block">
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
