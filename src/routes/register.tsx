import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { dashboardPathForRole, setSession, type SessionRole } from "@/lib/auth";
import { toast } from "sonner";
import { AuthShell } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — Lumen" },
      { name: "description", content: "Create your Lumen account to start learning or teaching." },
    ],
  }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<SessionRole>("student");
  const [loading, setLoading] = useState(false);

  return (
    <AuthShell>
      <p className="text-sm text-muted-foreground">Get started</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create your account</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const email = String(fd.get("email") || "");
          const name = String(fd.get("name") || "");
          setLoading(true);
          setTimeout(() => {
            setSession({ email, name, role });
            toast.success("Account created — welcome to Lumen!");
            navigate({ to: dashboardPathForRole(role) });
          }, 600);
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required placeholder="Ada Lovelace" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" name="pw" type="password" required minLength={6} placeholder="At least 6 characters" />
        </div>
        <div className="space-y-2">
          <Label>I'm joining as</Label>
          <RadioGroup value={role} onValueChange={(v) => setRole(v as SessionRole)} className="grid grid-cols-2 gap-2">
            {(["student","teacher"] as const).map((r) => (
              <label key={r} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm capitalize transition ${role === r ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"}`}>
                <RadioGroupItem value={r} className="sr-only" />
                <span className="grid h-6 w-6 place-items-center rounded-full border">{role === r && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                {r}
              </label>
            ))}
          </RadioGroup>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating…" : (<>Create account <ArrowRight className="ml-1.5 h-4 w-4" /></>)}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
