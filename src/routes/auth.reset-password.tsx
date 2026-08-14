// src/routes/auth.reset-password.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { resetPasswordRequest } from "@/services/auth.service";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get("access_token") || "";
  const refreshToken = hash.get("refresh_token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toast.error("رابط إعادة التعيين غير صالح.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordRequest({ accessToken, refreshToken, newPassword: password });
      toast.success("تم تحديث كلمة المرور بنجاح، سجّل الدخول الآن.");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحديث كلمة المرور.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">تعيين كلمة مرور جديدة</h1>
        <Input
          type="password"
          minLength={6}
          required
          placeholder="كلمة المرور الجديدة"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
        </Button>
      </form>
    </div>
  );
}