import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import {
  getQuizzes,
  storageKeys,
  type Quiz,
  getAssignments,
  type Assignment,
  getLiveSessions,
  type LiveSession,
  getUploads,
  type Upload,
} from "@/lib/lms-storage";
import { QuizService } from "@/services/quizService";
import { getReminders } from "@/services/live"; // جديد

/* ============ Quizzes ============ */
export function useQuizzes(): Quiz[] {
  return useKeyedStorage(storageKeys.teacherQuizzes, getQuizzes);
}

export function useQuiz(id: string | undefined): Quiz | undefined {
  const quizzes = useQuizzes();
  if (!id) return undefined;
  return quizzes.find((q) => q.id === id) ?? QuizService.get(id);
}

/* ============ Assignments ============ */
export function useAssignments(): Assignment[] {
  return useKeyedStorage(storageKeys.teacherAssignments, getAssignments);
}

/* ============ Live sessions ============ */
export function useLiveSessions(): LiveSession[] {
  return useKeyedStorage(storageKeys.teacherLive, getLiveSessions);
}

/* ============ Student live reminders (جديد) ============ */
export function useLiveReminders(): string[] {
  return useKeyedStorage(storageKeys.studentLiveReminders, getReminders);
}

/* ============ Uploads ============ */
export function useUploads(): Upload[] {
  return useKeyedStorage(storageKeys.teacherUploads, getUploads);
}