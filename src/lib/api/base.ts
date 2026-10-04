/**
 * API base URL and shared fetch helper.
 *
 * All other api/* modules import from this file instead of duplicating
 * the fetch logic.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send HttpOnly cookie automatically
    headers: { "Content-Type": "application/json" },
    ...init,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = body?.detail
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((d: { msg?: string; loc?: string[] }) => d.msg ?? JSON.stringify(d)).join("; ")
        : detail != null
        ? JSON.stringify(detail)
        : res.statusText || "API error"
    throw new ApiError(message, res.status, body)
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T
  }

  return res.json() as Promise<T>
}
