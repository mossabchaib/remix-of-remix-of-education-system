import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Menu, LayoutDashboard, LogOut, Globe, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/useSession";
import { clearSession, dashboardPathForRole } from "@/lib/auth";
import { toast } from "sonner";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const nav = [
    { to: "/", label: t("nav.home") },
    { to: "/courses", label: t("nav.courses") },
    { to: "/pricing", label: t("nav.pricing") },
    { to: "/about", label: t("nav.about") },
  ] as const;

  const languages = [
    { code: "en", label: "English" },
    { code: "ar", label: "العربية" },
    { code: "fr", label: "Français" },
  ];

  const handleLanguageChange = (code: string) => {
    console.log("Changing language to:", code);
    i18n.changeLanguage(code);
  };

  const currentLangLabel = languages.find((l) => l.code === i18n.language)?.label || "English";

  const initials = session
    ? session.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "L"
    : "";

  const handleSignOut = () => {
    clearSession();
    toast.success(t("common.signedOut"));
    navigate({ to: "/" });
  };

  const dashHref = session ? dashboardPathForRole(session.role) : "/login";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Lumen<span className="text-primary">.</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground data-[status=active]:text-primary data-[status=active]:font-semibold"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Language Selection Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg"
              >
                <Globe className="h-4 w-4 opacity-70" />
                <span>{currentLangLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-1.5">
              <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] text-muted-foreground font-normal">
                Select Language
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="flex items-center justify-between rounded-md cursor-pointer px-2.5 py-2 text-xs font-medium"
                >
                  <span>{lang.label}</span>
                  {i18n.language === lang.code && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2.5 px-2 rounded-full hover:bg-muted/60">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium max-w-[120px] truncate">{session.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuLabel className="px-2.5 py-2">
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-sm font-medium text-foreground truncate">{session.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{session.email}</span>
                    <span className="mt-1 text-[10px] uppercase font-semibold tracking-wider text-primary">{session.role}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-md cursor-pointer">
                  <Link to={dashHref}><LayoutDashboard className="me-2 h-4 w-4 text-muted-foreground" /> {t("common.dashboard")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="rounded-md cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="me-2 h-4 w-4" /> {t("common.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="font-medium">
                <Link to="/login">{t("common.signIn")}</Link>
              </Button>
              <Button asChild size="sm" className="shadow-sm font-medium">
                <Link to="/register">{t("common.getStarted")}</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile View Controls */}
        <div className="md:hidden flex items-center gap-1.5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-6">
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-6">
                  {/* Mobile Brand */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-primary-foreground">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <span className="text-base font-semibold">Lumen.</span>
                  </div>

                  {/* Mobile Navigation Links */}
                  <nav className="flex flex-col gap-1">
                    {nav.map((n) => (
                      <Link
                        key={n.to}
                        to={n.to}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        {n.label}
                      </Link>
                    ))}
                  </nav>

                  {/* Mobile Language Selection List */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground px-1">Language / Langue</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {languages.map((lang) => (
                        <Button
                          key={lang.code}
                          variant={i18n.language === lang.code ? "default" : "outline"}
                          size="sm"
                          className="text-xs font-medium h-9 rounded-lg"
                          onClick={() => handleLanguageChange(lang.code)}
                        >
                          {lang.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile Session Footer */}
                <div className="border-t pt-4 space-y-3">
                  {session ? (
                    <>
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                        <p className="text-sm font-medium text-foreground truncate">{session.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.email}</p>
                      </div>
                      <Button asChild variant="outline" className="w-full justify-start rounded-lg">
                        <Link to={dashHref} onClick={() => setOpen(false)}>
                          <LayoutDashboard className="me-2 h-4 w-4" /> {t("common.dashboard")}
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setOpen(false);
                          handleSignOut();
                        }}
                      >
                        <LogOut className="me-2 h-4 w-4" /> {t("common.signOut")}
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" className="w-full rounded-lg">
                        <Link to="/login" onClick={() => setOpen(false)}>{t("common.signIn")}</Link>
                      </Button>
                      <Button asChild className="w-full rounded-lg shadow-sm">
                        <Link to="/register" onClick={() => setOpen(false)}>{t("common.getStarted")}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}