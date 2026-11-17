/**
 * API Client abstraction designed for seamless migration from local Express dev proxy
 * to Cloudflare Workers + Hono REST endpoints (`/api/*`).
 */

export interface BackendHealthStatus {
  status: 'ok' | 'offline';
  aiConnected: boolean;
  runtime: string;
}

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL ?? '';

export async function fetchBackendHealth(): Promise<BackendHealthStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return { status: 'offline', aiConnected: false, runtime: 'browser-only' };
    }
    const data = (await res.json()) as {
      status?: string;
      aiConnected?: boolean;
      runtime?: string;
    };
    return {
      status: data.status === 'ok' ? 'ok' : 'offline',
      aiConnected: Boolean(data.aiConnected),
      runtime: data.runtime ?? 'hono-compatible-proxy',
    };
  } catch {
    return { status: 'offline', aiConnected: false, runtime: 'browser-only' };
  }
}

export async function postApiJson<TReq, TRes>(
  path: string,
  payload: TReq,
  timeoutMs = 25000
): Promise<{ ok: boolean; status: number; data?: TRes; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error:
          (body as { error?: string }).error ??
          `API request failed (${res.status})`,
      };
    }
    return { ok: true, status: res.status, data: body as TRes };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      error: isAbort
        ? 'Request timed out waiting for the AI backend.'
        : err instanceof Error
        ? err.message
        : 'Network unavailable',
    };
  } finally {
    clearTimeout(timer);
  }
}
