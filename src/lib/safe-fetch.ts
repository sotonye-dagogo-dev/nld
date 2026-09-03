// Safe fetch JSON helper — handles Vercel 413 HTML and other non-JSON responses gracefully.
// Returns parsed JSON if content-type is JSON, otherwise throws with extracted text snippet.

export async function safeFetchJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      return (await res.json()) as T;
    } catch {
      const text = await res.text().catch(() => "");
      throw new Error(text.slice(0, 600) || `Server returned invalid JSON (${res.status}).`);
    }
  }
  const text = await res.text().catch(() => "");
  const lower = text.toLowerCase();
  if (res.status === 413 || lower.includes("payload") || lower.includes("too large") || text.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
    throw new Error(
      "File too large for Vercel's request limit (~4.5MB on hobby). Compress the file, use a smaller file, or upgrade to Pro / use direct Supabase upload for 50MB files.",
    );
  }
  if (text.trim().startsWith("<") || lower.includes("<!doctype") || lower.includes("<html")) {
    throw new Error(text.slice(0, 600) || `Server error (${res.status} ${res.statusText}). Please try again.`);
  }
  // If body is empty or plain text, surface it
  if (text) throw new Error(text.slice(0, 600));
  throw new Error(`Request failed (${res.status} ${res.statusText}). Please try again.`);
}

export async function parseSafe<T>(res: Response): Promise<{ ok: boolean; data: T | null; rawText: string }> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const data = (await res.json()) as T;
      return { ok: true, data, rawText: "" };
    } catch {
      const text = await res.text().catch(() => "");
      return { ok: false, data: null, rawText: text };
    }
  }
  const text = await res.text().catch(() => "");
  return { ok: false, data: null, rawText: text };
}
