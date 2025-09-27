export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // optional
    ...options,
  });

  let body: any = null;
  try {
    body = await res.json();
    console.log("API response body:", body);
  } catch (_) {}

  if (!res.ok) {
    const error =
      body?.detail ??
      body?.error ??
      (Array.isArray(body) ? body[0]?.msg : undefined) ??
      res.statusText;
    return { ok: false, error, status: res.status };
  }
  return { ok: true, data: body as T, status: res.status };
}
