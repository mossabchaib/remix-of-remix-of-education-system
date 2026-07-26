export {
  getQuizzes as list,
  getQuiz as get,
  setQuizzes as replaceAll,
  upsertQuiz as save,
  deleteQuiz as remove,
} from "@/lib/lms-storage";
import type { Quiz } from "@/lib/lms-storage";
import { upsertQuiz } from "@/lib/lms-storage";
export function create(q: Omit<Quiz, "id">): Quiz {
  const withId: Quiz = { ...q, id: `q${Date.now()}` };
  upsertQuiz(withId);
  return withId;
}
