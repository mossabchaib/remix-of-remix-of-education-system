// src/service/api-client.ts
//
// Generic fetch wrapper: base URL, JSON headers, Bearer token, error handling.
// Requires VITE_API_URL in .env, e.g.:
//   VITE_API_URL=http://localhost:4000

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// Token keys live here so both lib/auth.ts (storage/session shape) and
// auth.service.ts / upload.service.ts (raw API calls) agree on where
// tokens are kept.
export const ACCESS_TOKEN_KEY = "lms.access_token";
export const REFRESH_TOKEN_KEY = "lms.refresh_token";
export const SESSION_ID_KEY = "lms.session_id"; 
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_ID_KEY);
}

export function storeSessionId(sessionId: string) {
  window.localStorage.setItem(SESSION_ID_KEY, sessionId);
}

export function clearSessionId() {
  window.localStorage.removeItem(SESSION_ID_KEY);
}
export function storeTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const sessionId = getSessionId(); // ← جديد

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionId ? { "x-session-id": sessionId } : {}), // ← جديد
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed with status ${res.status}`;

    // ← جديد: لو الجلسة انطردت (جهاز آخر سجّل دخول)، نظّف كل حاجة محلياً
    if (message === "SESSION_REVOKED") {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.localStorage.removeItem(SESSION_ID_KEY);
      window.location.href = "/login?reason=session_revoked";
    }

    throw new ApiError(message, res.status);
  }

  return data as T;
}

// Multipart upload via XHR — fetch() doesn't expose reliable upload-progress
// events, and this endpoint always carries a file, so it needs its own path
// instead of going through request()/JSON.stringify.
function uploadRequest<T>(
  path: string,
  formData: FormData,
  onProgress?: (pct: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getAccessToken();
    const sessionId = getSessionId(); // ← جديد
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${path}`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    if (sessionId) {
      xhr.setRequestHeader("x-session-id", sessionId); // ← جديد
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let parsed: any = null;
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        reject(new ApiError("Unexpected response from server.", xhr.status));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as T);
      } else {
        const message = parsed?.message ?? parsed?.error ?? `Request failed with status ${xhr.status}`;

        // ← جديد: نفس معاملة SESSION_REVOKED الموجودة في request()
        if (message === "SESSION_REVOKED") {
          window.localStorage.removeItem(ACCESS_TOKEN_KEY);
          window.localStorage.removeItem(REFRESH_TOKEN_KEY);
          window.localStorage.removeItem(SESSION_ID_KEY);
          window.location.href = "/login?reason=session_revoked";
        }

        reject(new ApiError(message, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error during upload.", 0));
    xhr.send(formData);
  });
}

/**
 * رفع مباشر إلى رابط خارجي (Supabase Signed Upload URL) — وليس إلى API_URL
 * الخاص بنا. مهم: لا نضيف Authorization header هنا، لأن التوثيق موجود
 * بالفعل داخل الـ token الموقّع ضمن الرابط نفسه.
 */
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", signedUrl);

    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      console.log(xhr.status, xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(xhr.responseText));
      }
    };

    xhr.onerror = reject;

    xhr.send(file);
  });
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  // NEW: multipart upload with progress callback (used for file uploads).
  upload: <T>(path: string, formData: FormData, onProgress?: (pct: number) => void) =>
    uploadRequest<T>(path, formData, onProgress),
  uploadToSignedUrl, // جديد — يُستخدم للرفع المباشر لـ Supabase
};

// ==========================================
// 🚀 ALL LMS API SERVICES (Categories, Courses, Modules, Lessons, Uploads)
// ==========================================

export const lmsApi = {
  // --- Categories ---
  getCategories: () => api.get<any[]>("/api/categories"),
  createCategory: (data: any) => api.post<any>("/api/categories", data),
  updateCategory: (id: string, data: any) => api.put<any>(`/api/categories/${id}`, data),
  deleteCategory: (id: string) => api.del<any>(`/api/categories/${id}`),

  // --- Courses ---
  getTeacherCourses: () => api.get<any[]>("/api/courses/mine"),
  getTeacherCourse: (id: string) => api.get<any>(`/api/courses/${id}`),
  createCourse: (data: any) => api.post<any>("/api/courses", data),
  updateCourse: (id: string, data: any) => api.put<any>(`/api/courses/${id}`, data),
  deleteCourse: (id: string) => api.del<any>(`/api/courses/${id}`),
  getallteachers:() => api.get<any[]>("/api/courses/"),
  // --- Modules & Lessons ---
  getCourseModules: (courseId: string) => api.get<any[]>(`/api/courses/${courseId}/modules`),
  syncCourseModules: (courseId: string, modules: any[]) => api.put<any>(`/api/courses/${courseId}/modules`, { modules }),
  getCourseLessons: (courseId: string) => api.get<any[]>(`/api/courses/${courseId}/lessons`),
  addLesson: (moduleId: string, data: any) => api.post<any>(`/api/modules/${moduleId}/lessons`, data),
  updateLesson: (id: string, data: any) => api.put<any>(`/api/lessons/${id}`, data),
  deleteLesson: (id: string) => api.del<any>(`/api/lessons/${id}`),
  deleteModule: (id: string) => api.del<any>(`/api/modules/${id}`),

  // --- Quizzes ---
 quizzes: {
  // --- Quiz CRUD ---
  listByCourse: (courseId: string) =>
    api.get<{ data: any[] }>(`/api/quizzes/course/${courseId}`),

  get: (id: string) =>
    api.get<{ data: any }>(`/api/quizzes/${id}`),

  create: (data: any) =>{
    console.log("Creating quiz with data:", data);
    api.post<{ data: any }>("/api/quizzes", data)},

  update: (id: string, data: any) =>
    api.put<{ data: any }>(`/api/quizzes/${id}`, data),

  remove: (id: string) =>
    api.del<any>(`/api/quizzes/${id}`),

  // --- Attempts ---
  saveAttempt: (
    quizId: string,
    payload: {
      score: number;
      total: number;
      answers: Record<string, any>;
    }
  ) =>
    api.post<{ data: any }>(
      `/api/quizzes/${quizId}/attempts`,
      payload
    ),

  getMyAttempts: () =>
    api.get<{ data: any[] }>("/api/quizzes/attempts/mine"),

  // --- Question CRUD ---
  addQuestion: (quizId: string, data: any) =>
    api.post<{ data: any }>(
      `/api/quizzes/${quizId}/questions`,
      data
    ),

  updateQuestion: (
    quizId: string,
    questionId: string,
    data: any
  ) =>
    api.put<{ data: any }>(
      `/api/quizzes/${quizId}/questions/${questionId}`,
      data
    ),

  removeQuestion: (
    quizId: string,
    questionId: string
  ) =>
    api.del<any>(
      `/api/quizzes/${quizId}/questions/${questionId}`
    ),
},
// --- Progress ---
  // Maps to the `lesson_progress` table: id, user_id, course_id, lesson_id,
  // completed, completed_at.
  progress: {
    // كل تقدّم المستخدم الحالي، مجمّع حسب courseId → { [courseId]: { [lessonId]: true } }
    getMine: () => api.get<{ data: Record<string, Record<string, boolean>> }>("/api/progress"),

    // صفوف خام لكورس واحد (lesson_id, completed, completed_at)
    getCourse: (courseId: string) =>
      api.get<{ data: any[] }>(`/api/progress/course/${courseId}`),

    // ملخص رقمي: { done, total, pct }
    getCourseSummary: (courseId: string) =>
      api.get<{ data: { done: number; total: number; pct: number } }>(
        `/api/progress/course/${courseId}/summary`
      ),
 getTeacherRollup: () =>
    api.get<{ data: any[] }>("/api/progress/teacher/rollup"),
    // تحديد/إلغاء إكمال درس
    setLessonComplete: (payload: { courseId: string; lessonId: string; completed: boolean }) =>
      api.post<{ data: any }>("/api/progress", payload),
  },
// --- Live Sessions ---
  // Maps to the `live_sessions` table: id, title, course_id, host,
  // starts_at, duration, attendees, join_url, status.
  live: {
    list: (params?: { courseId?: string; status?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.courseId) qs.set("courseId", params.courseId);
      if (typeof params?.status === "boolean") qs.set("status", String(params.status));
      const q = qs.toString();
      return api.get<{ data: any[] }>(`/api/live-sessions${q ? `?${q}` : ""}`);
    },

    listByCourse: (courseId: string) =>
      api.get<{ data: any[] }>(`/api/live-sessions/course/${courseId}`),

    get: (id: string) => api.get<{ data: any }>(`/api/live-sessions/${id}`),

    create: (data: any) => api.post<{ data: any }>("/api/live-sessions", data),

    update: (id: string, data: any) =>
      api.put<{ data: any }>(`/api/live-sessions/${id}`, data),

    end: (id: string) => api.patch<{ data: any }>(`/api/live-sessions/${id}/end`),

    remove: (id: string) => api.del<any>(`/api/live-sessions/${id}`),
  },
    users: {
    getMe: () => api.get<{ profile: any }>("/api/users/me"),
    updateMe: (data: any) => api.patch<{ profile: any }>("/api/users/me", data),
    list: () => api.get<{ profiles: any[] }>("/api/users"),
    changeRole: (id: string, role: "admin" | "teacher" | "student") =>
      api.patch<{ profile: any }>(`/api/users/${id}/role`, { role }),
  },
  // --- Subscriptions ---
  // Maps to the `subscriptions` table: id, user_id, plan_name, amount, status,
  // starts_at, ends_at, payment_proof_url, reviewed_by, reviewed_at.
  subscriptions: {
    // الطالب: إرسال طلب اشتراك مع إثبات الدفع (base64)
    submit: (data: { plan_name: string; amount: number; payment_proof: string }) =>
      api.post<{ subscription: any }>("/api/subscriptions", data),

    // الطالب: جلب اشتراكي الحالي
    getMine: () => api.get<{ subscription: any }>("/api/subscriptions/me"),

    // admin: جلب الطلبات المعلّقة فقط
    listPending: () => api.get<{ subscriptions: any[] }>("/api/subscriptions/pending"),

    // admin: جلب كل الاشتراكات (كل الحالات)
    listAll: () => api.get<{ subscriptions: any[] }>("/api/subscriptions"),

    // admin: قبول الاشتراك
    approve: (id: string, days: number) =>
  api.put<{ subscription: any }>(`/api/subscriptions/${id}/approve`, { days }),

    // admin: رفض الاشتراك
    reject: (id: string) => api.put<{ subscription: any }>(`/api/subscriptions/${id}/reject`),
  },
  // --- Auth ---
  auth: {
    signUp: (data: { email: string; password: string; fullName?: string }) =>
      api.post<{ message: string; data: { user: any; session: any } }>(
        "/api/auth/signup",
        data
      ),

    signIn: async (data: { email: string; password: string }) => {
  const res = await api.post<{
    message: string;
    data: { user: any; session: { access_token: string; refresh_token: string }; sessionId: string };
  }>("/api/auth/signin", data);

  if (res.data?.session?.access_token && res.data?.session?.refresh_token) {
    storeTokens(res.data.session.access_token, res.data.session.refresh_token);
  }

  if (res.data?.sessionId) {
    storeSessionId(res.data.sessionId); // ← جديد
  }

  return res;
},

   signOut: async () => {
  const refreshToken =
    typeof window !== "undefined" ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;

  const res = await api.post<{ message: string }>("/api/auth/signout", {
    refreshToken,
  });

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(SESSION_ID_KEY); // ← جديد
  }

  return res;
},

   refresh: async () => {
  const refreshToken =
    typeof window !== "undefined" ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  const sessionId = getSessionId(); // ← جديد

  if (!refreshToken) {
    throw new ApiError("No refresh token found.", 401);
  }

  const res = await api.post<{ message: string; data: { session: any } }>(
    "/api/auth/refresh",
    { refreshToken, sessionId } // ← أضفنا sessionId
  );

  if (res.data?.session?.access_token && res.data?.session?.refresh_token) {
    storeTokens(res.data.session.access_token, res.data.session.refresh_token);
  }

  return res;
},

    forgotPassword: (data: { email: string; redirectTo?: string }) =>
      api.post<{ message: string }>("/api/auth/forgot-password", data),
  },
  // --- Ratings ---
  // Maps to the `course_ratings` table: id, course_id, student_id, rating.
  ratings: {
    // معدل التقييم وعدد الأصوات لكورس معين (عام، بلا auth)
    getCourseRatings: (courseId: string) =>
      api.get<{ data: { course_id: string; average_rating: number; total_ratings: number } }>(
        `/api/ratings/course/${courseId}`
      ),

    // تقييم الطالب الحالي لكورس معين (null إذا ما قيّمش بعد)
    getMyRating: (courseId: string) =>
      api.get<{ data: any }>(`/api/ratings/course/${courseId}/mine`),

    // إضافة أو تعديل تقييم (1 إلى 5)
    rateCourse: (courseId: string, rating: number) =>
      api.post<{ data: any }>(`/api/ratings/course/${courseId}`, { rating }),

    // حذف تقييم الطالب لكورس معين
    deleteRating: (courseId: string) => api.del<any>(`/api/ratings/course/${courseId}`),
  },
  // --- Uploads ---
  // Maps to the `uploads` table: id, file_url, file_key, file_name, mime_type,
  // file_size, kind, lesson_id, teacher_id, upload_date.
  uploads: {
    list: (params?: { courseId?: string; lessonId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.courseId) qs.set("courseId", params.courseId);
      if (params?.lessonId) qs.set("lessonId", params.lessonId);
      const q = qs.toString();
      return api.get<{ data: any[] }>(`/api/uploads${q ? `?${q}` : ""}`);
    },

    // جديد: الخطوة 1 — طلب رابط رفع موقّع
  sign: async (payload: { fileName: string; kind: "video" | "pdf"; courseId?: string }) => {
    console.log("📤 Sending sign payload:", payload);
    try {
      const response = await api.post<{ data: { path: string; token: string; signedUrl: string } }>(
        "/api/uploads/sign",
        payload
      );
      console.log("📥 Sign response received:", response);
      return response;
    } catch (error) {
      console.error("❌ Sign API error:", error);
      throw error;
    }
  },

    // جديد: الخطوة 3 — تسجيل الميتاداتا بعد نجاح الرفع المباشر
    confirm: (payload: {
      key: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      kind: "video" | "pdf";
      course_id?: string;
      lesson_id?: string;
    }) => api.post<{ data: any }>("/api/uploads/confirm", payload),

    create: (
      file: File,
      options?: { courseId?: string; lessonId?: string; onProgress?: (pct: number) => void }
    ) => {
      const formData = new FormData();
      formData.append("file", file);
      if (options?.courseId) formData.append("courseId", options.courseId);
      if (options?.lessonId) formData.append("lessonId", options.lessonId);
      return api.upload<{ data: any }>("/api/uploads", formData, options?.onProgress);
    },
    remove: (id: string) => api.del<any>(`/api/uploads/${id}`),
  },
};