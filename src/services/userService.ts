// src/services/user.service.ts
import {
  getAdminUsers,
  getAdminUser,
  upsertAdminUser,
  deleteAdminUser,
} from "@/lib/lms-storage";
import type { ProfileData } from "@/lib/lms-storage";

type Role = "admin" | "teacher" | "student";

/** جلب كل المستخدمين (admin). */
export const list = getAdminUsers;

/** جلب مستخدم واحد بالـ id. */
export const get = getAdminUser;

/**
 * تغيير role مستخدم فقط — هو الوحيد المدعوم فـ الباك اند
 * (PATCH /api/users/:id/role). أي حقول أخرى فـ u يتم تجاهلها.
 */
export function save(u: Pick<ProfileData, "id" | "role">) {
  if (!u.id || !u.role) {
    return Promise.reject(new Error("save() requires { id, role }"));
  }
  return upsertAdminUser({ id: u.id, role: u.role as Role });
}

/**
 * ⚠️ لا يوجد endpoint لإنشاء مستخدم من طرف الأدمن فـ الباك اند حالياً.
 * المستخدمون يتخلقو عبر auth signup فقط.
 */
export function create(_u: Omit<ProfileData, "id">): never {
  throw new Error("create() is not supported: no POST /api/users endpoint on the backend.");
}

/**
 * ⚠️ لا يوجد DELETE /api/users/:id فـ الباك اند حالياً.
 */
export const remove = deleteAdminUser;

/** فلترة محلية حسب role (تجلب اللائحة كاملة ثم تفلتر). */
export async function byRole(role: Role): Promise<ProfileData[]> {
  const all = await getAdminUsers();
  return all.filter((u:any) => u.role === role);
}