// src/routes/auth.callback.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { storeTokens } from "@/services/api-client";
import { fetchProfileRequest } from "@/services/auth.service";
import { setSession, dashboardPathForRole } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) {
        toast.error("رابط التأكيد غير صالح أو منتهي الصلاحية.");
        navigate({ to: "/login" });
        return;
      }

      try {
        storeTokens(accessToken, refreshToken);
        const profile = await fetchProfileRequest();
        setSession({ email: profile.email, name: profile.full_name, role: profile.role });
        toast.success("تم تأكيد حسابك بنجاح!");
        navigate({ to: dashboardPathForRole(profile.role) });
      } catch {
        toast.error("فشل تأكيد الحساب. حاول تسجيل الدخول يدوياً.");
        navigate({ to: "/login" });
      }
    };
    run();
  }, [navigate]);

  return <div className="flex min-h-screen items-center justify-center">جارٍ تأكيد حسابك...</div>;
}