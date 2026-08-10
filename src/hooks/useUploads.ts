import { useCallback, useEffect, useState } from "react";
import { UploadService, type UploadRecord } from "@/services/uploadService";

/**
 * Fetches uploads from the backend (Cloudflare R2 + Supabase metadata)
 * instead of reading from localStorage. Optionally scoped to a course.
 */
export function useUploads(courseId?: string, courseTitle?: string) {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await UploadService.list({ courseId, courseTitle });
      setUploads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load uploads.");
    } finally {
      setLoading(false);
    }
  }, [courseId, courseTitle]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { uploads, loading, error, refresh };
}