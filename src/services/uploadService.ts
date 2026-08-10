import { api, ApiError, API_URL, getAccessToken } from "./api-client";

export type UploadKind = "video" | "pdf";

export type UploadRecord = {
  id: string;
  title: string; // file_name
  course: string; // resolved course title (falls back to courseId or "General")
  courseId?: string;
  lessonId?: string; // NEW: mirrors uploads.lesson_id
  size: string; // human-readable, derived from file_size
  uploaded: string; // upload_date, YYYY-MM-DD
  kind: UploadKind;
  progress: number; // always 100 once listed; in-flight progress is tracked client-side
  url: string;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toUploadRecord(row: any, courseTitle?: string): UploadRecord {
  return {
    id: row.id,
    title: row.file_name,
    course: courseTitle ?? row.course_id ?? "General",
    courseId: row.course_id ?? undefined,
    lessonId: row.lesson_id ?? undefined, // NEW
    size: humanSize(row.file_size),
    uploaded: (row.upload_date ?? "").slice(0, 10),
    kind: row.kind,
    progress: 100,
    url: row.file_url,
  };
}

export const UploadService = {
  async list(params?: { courseId?: string; courseTitle?: string; lessonId?: string }): Promise<UploadRecord[]> {
    const query = new URLSearchParams();
    if (params?.courseId) query.set("courseId", params.courseId);
    if (params?.lessonId) query.set("lessonId", params.lessonId);
    const qs = query.toString();

    // ✅ تصحيح المسار ليكون /api/uploads
    const body = await api.get<{ data: any[] }>(`/api/uploads${qs ? `?${qs}` : ""}`);
    return (body.data ?? []).map((row) => toUploadRecord(row, params?.courseTitle));
  },

  /**
   * Uploads a real file to the backend using XHR.
   */
  async create(
    file: File,
    options?: {
      courseId?: string;
      courseTitle?: string;
      lessonId?: string; // NEW: forwarded to the backend and stored in uploads.lesson_id
      onProgress?: (pct: number) => void;
    }
  ): Promise<UploadRecord> {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.courseId) formData.append("courseId", options.courseId);
    if (options?.lessonId) formData.append("lessonId", options.lessonId); // NEW

    const body = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // ✅ المسار صحيح لـ POST
      xhr.open("POST", `${API_URL}/api/uploads`);

      const token = getAccessToken();
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options?.onProgress) {
          options.onProgress(Math.round((event.loaded / event.total) * 100));
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
          resolve(parsed);
        } else {
          reject(
            new ApiError(
              parsed?.message ?? parsed?.error ?? `Upload failed with status ${xhr.status}`,
              xhr.status
            )
          );
        }
      };

      xhr.onerror = () => reject(new ApiError("Network error during upload.", 0));
      xhr.send(formData);
    });

    return toUploadRecord(body.data, options?.courseTitle);
  },

  async remove(id: string): Promise<void> {
    // ✅ تصحيح المسار ليكون /api/uploads/:id
    await api.del<void>(`/api/uploads/${id}`);
  },
};