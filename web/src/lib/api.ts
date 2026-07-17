// Plain fetch wrapper. Every non-2xx response throws an ApiRequestError whose
// message comes from the server's { error, detail } body — errors are surfaced,
// never swallowed.

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      if (body.error) message = body.error;
      detail = body.detail;
    } catch {
      // non-JSON error body — keep the status message
    }
    throw new ApiRequestError(res.status, message, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
