import {
  getAssignments,
  setAssignmentsList,
  upsertAssignment,
  deleteAssignment,
  type Assignment,
} from "@/lib/lms-storage";
export const list = getAssignments;
export const replaceAll = setAssignmentsList;
export const save = upsertAssignment;
export const remove = deleteAssignment;
export function create(a: Omit<Assignment, "id">): Assignment {
  const withId: Assignment = { ...a, id: `a${Date.now()}` };
  upsertAssignment(withId);
  return withId;
}
