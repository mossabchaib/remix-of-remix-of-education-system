import { getAdminUsers, setAdminUsers, getAdminUser, upsertAdminUser, deleteAdminUser } from "@/lib/lms-storage";
import type { User } from "@/lib/mock-data";

export const list = getAdminUsers;
export const get = getAdminUser;
export const remove = deleteAdminUser;
export function save(u: User) { upsertAdminUser(u); }
export function create(u: Omit<User, "id">): User {
  const withId: User = { ...u, id: `u${Date.now()}` };
  upsertAdminUser(withId);
  return withId;
}
export function byRole(role: User["role"]): User[] {
  return getAdminUsers().filter((u) => u.role === role);
}
export function replaceAll(list: User[]) { setAdminUsers(list); }
