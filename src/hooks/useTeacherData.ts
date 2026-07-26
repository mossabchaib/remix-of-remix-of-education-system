import { useKeyedStorage } from "./useKeyedStorage";
import {
  storageKeys,
  getQuizzes,
  getAssignments,
  getLiveSessions,
} from "@/lib/lms-storage";

export function useQuizzes() {
  return useKeyedStorage(storageKeys.teacherQuizzes, getQuizzes);
}
export function useAssignments() {
  return useKeyedStorage(storageKeys.teacherAssignments, getAssignments);
}
export function useLiveSessions() {
  return useKeyedStorage(storageKeys.teacherLive, getLiveSessions);
}
