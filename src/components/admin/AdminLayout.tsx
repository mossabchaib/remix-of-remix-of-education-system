import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Search } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-lg">
            <SidebarTrigger className={isRTL ? "rotate-180" : ""} />
            <div className="ms-auto flex items-center gap-2">
           
             <div className="flex items-center gap-2.5">
  <Avatar className="h-8 w-8">
    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">AD</AvatarFallback>
  </Avatar>
  <div className="hidden text-start sm:block">
    <p className="text-sm font-medium leading-none">Admin</p>
      </div>
</div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 space-y-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
