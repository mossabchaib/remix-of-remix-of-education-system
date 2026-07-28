import {
  getAssignments,
  setAssignmentsList,
  upsertAssignment,
  deleteAssignment,
  addSubmission,
  addNotification,
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

/**
 * تسليم واجب: يحفظ الـ submission، يحدّث حالة الـ Assignment إلى "Submitted"،
 * ويبعث إشعار تأكيد.
 */
export function submit(assignment: Assignment, notes: string) {
  const submission = addSubmission(assignment.id, notes);
  save({ ...assignment, status: "Submitted" });

  addNotification({
    title: "Assignment submitted",
    body: `Your submission for "${assignment.title}" was received.`,
    kind: "assignment",
    audience: { scope: "role", role: "student" },
    link: "/dashboard/student/assignments",
    sourceId: `submit:${assignment.id}`,
  });

  return submission;
}