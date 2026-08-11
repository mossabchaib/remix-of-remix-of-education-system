import { Link } from "@tanstack/react-router";
import { GraduationCap, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
               <span className="relative flex h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl p-0.5 shadow-md shadow-sky-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-sky-500/30">
      <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-background/90 backdrop-blur-sm transition-colors group-hover:bg-background/70">
       <img src="public/logo.png" alt="El Manara Logo" className="h-16 w-16 object-contain" />
      </span>
    </span>
              <span className="text-lg font-semibold tracking-tight">El Manara</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              A premium learning platform for teams and individuals who want to grow with clarity.
            </p>
          </div>
          <FooterCol title="Product" items={[["Courses","/courses"],["Pricing","/pricing"],["For teams","/pricing"]]} />
          <FooterCol title="Company" items={[["About","/about"],["Contact","/contact"],["Careers","/about"]]} />
          <FooterCol title="Account" items={[["Sign in","/login"],["Create account","/register"],["Admin","/admin"]]} />
        </div>
        <div className="mt-10 flex flex-col-reverse items-start justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Lumen Learning, Inc. All rights reserved.</p>
          <div className="flex items-center gap-3 text-muted-foreground">
            <a href="#" aria-label="Twitter" className="hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="GitHub" className="hover:text-foreground"><Github className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-foreground"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map(([label, href]) => (
          <li key={label}>
            <Link to={href} className="hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
