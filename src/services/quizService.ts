import {
  getQuizzes,
  getQuiz as getQuizRaw,
  upsertQuiz,
  deleteQuiz,
  type Quiz,
  type Question,
  type QuestionAnswer,
} from "@/lib/lms-storage";

function genId(prefix: string) {
  return `${prefix}_${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

export const QuizService = {
  list(): Quiz[] {
    return getQuizzes();
  },

  get(id: string): Quiz | undefined {
    return getQuizRaw(id);
  },

  create(input: { title: string; course: string; minutes: number; questions?: Question[] }): Quiz {
    const quiz: Quiz = {
      id: genId("quiz"),
      title: input.title,
      course: input.course,
      minutes: input.minutes,
      questions: input.questions ?? [],
    };
    upsertQuiz(quiz);
    return quiz;
  },

  save(quiz: Quiz) {
    upsertQuiz(quiz);
  },

  remove(id: string) {
    deleteQuiz(id);
  },

  addQuestion(quizId: string, question: Omit<Question, "id">): Question | null {
    const quiz = getQuizRaw(quizId);
    if (!quiz) return null;
    const q: Question = { ...question, id: genId("qn") } as Question;
    upsertQuiz({ ...quiz, questions: [...quiz.questions, q] });
    return q;
  },

  updateQuestion(quizId: string, question: Question): boolean {
    const quiz = getQuizRaw(quizId);
    if (!quiz) return false;
    const idx = quiz.questions.findIndex((q) => q.id === question.id);
    if (idx === -1) return false;
    const questions = [...quiz.questions];
    questions[idx] = question;
    upsertQuiz({ ...quiz, questions });
    return true;
  },

  removeQuestion(quizId: string, questionId: string): boolean {
    const quiz = getQuizRaw(quizId);
    if (!quiz) return false;
    upsertQuiz({ ...quiz, questions: quiz.questions.filter((q) => q.id !== questionId) });
    return true;
  },

  reorderQuestions(quizId: string, orderedIds: string[]): boolean {
    const quiz = getQuizRaw(quizId);
    if (!quiz) return false;
    const map = new Map(quiz.questions.map((q) => [q.id, q]));
    const questions = orderedIds.map((id) => map.get(id)).filter(Boolean) as Question[];
    upsertQuiz({ ...quiz, questions });
    return true;
  },

  gradeAttempt(quiz: Quiz, answers: Record<string, QuestionAnswer>) {
    let score = 0;
    const total = quiz.questions.length;
    const perQuestion: { questionId: string; correct: boolean }[] = [];

    for (const q of quiz.questions) {
      const a = answers[q.id];
      let correct = false;

      if (q.type === "qcm" && a?.type === "qcm") {
        const expected = [...(q.correctOptionIndexes ?? [])].sort();
        const got = [...a.selected].sort();
        correct = expected.length === got.length && expected.every((v, i) => v === got[i]);
      } else if (q.type === "true_false" && a?.type === "true_false") {
        correct = a.selected === q.correctBoolean;
      } else if (q.type === "matching" && a?.type === "matching") {
        correct = (q.pairs ?? []).every((p) => a.selected[p.id] === p.right);
      }

      if (correct) score += 1;
      perQuestion.push({ questionId: q.id, correct });
    }

    return { score, total, perQuestion };
  },
};