import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStorage";
import type { ApiErrorBody } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/** Typed error thrown for any non-2xx API response. */
export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || "Request failed");
    this.name = "ApiError";
    this.code = body.code || "unknown_error";
    this.status = status;
    this.fields = body.fields;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the stored access token as a Bearer header. Default true. */
  auth?: boolean;
  /** Skip the automatic silent-refresh-and-retry on 401 (used by the auth endpoints themselves). */
  skipRefresh?: boolean;
}

interface UploadOptions {
  method?: "POST" | "PUT" | "PATCH";
  /** Attach the stored access token as a Bearer header. Default true. */
  auth?: boolean;
  /** Skip the automatic silent-refresh-and-retry on 401. */
  skipRefresh?: boolean;
}

// De-duplicate concurrent refresh attempts so multiple 401s in flight
// trigger only a single POST /auth/refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
    };
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody> {
  try {
    const json = await res.json();
    if (json && json.error) return json.error as ApiErrorBody;
  } catch {
    // response had no/invalid JSON body
  }
  return {
    code: "unknown_error",
    message: `Request failed with status ${res.status}`,
  };
}

/**
 * Shared transport used by both `apiRequest` (JSON) and `apiUpload`
 * (multipart). Performs the request, and on a 401 (when `auth` and
 * `!skipRefresh`) attempts exactly one silent `POST /auth/refresh` -
 * de-duplicated across concurrent callers - before retrying the original
 * request once with the new access token. If the refresh also fails, the
 * stored tokens are cleared and the original (401) response is returned.
 *
 * `buildInit` is called fresh on every attempt (including the retry) so it
 * always reads the current access token via `getAccessToken()`.
 */
async function fetchWithAuthRetry(
  path: string,
  buildInit: (token: string | null) => RequestInit,
  auth: boolean,
  skipRefresh: boolean
): Promise<Response> {
  const doFetch = () =>
    fetch(`${API_URL}${path}`, buildInit(auth ? getAccessToken() : null));

  let res = await doFetch();

  if (res.status === 401 && auth && !skipRefresh) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      res = await doFetch();
    } else {
      clearTokens();
    }
  }

  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const errorBody = await parseErrorBody(res);
    if (res.status === 401) {
      clearTokens();
    }
    throw new ApiError(res.status, errorBody);
  }

  // Some endpoints (e.g. 204 already handled above) may still return an
  // empty body with a 2xx status; guard against JSON parse errors.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, skipRefresh = false } = options;

  const buildInit = (token: string | null): RequestInit => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
  };

  const res = await fetchWithAuthRetry(path, buildInit, auth, skipRefresh);
  return handleResponse<T>(res);
}

/**
 * Like `apiRequest`, but sends a `FormData` body (multipart/form-data) for
 * file uploads. Deliberately does NOT set a Content-Type header - the
 * browser sets it (including the multipart boundary) when the body is a
 * FormData instance. Shares the same auth-header attachment and
 * single-refresh-on-401 behavior as `apiRequest`.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: UploadOptions = {}
): Promise<T> {
  const { method = "POST", auth = true, skipRefresh = false } = options;

  const buildInit = (token: string | null): RequestInit => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return { method, headers, body: formData };
  };

  const res = await fetchWithAuthRetry(path, buildInit, auth, skipRefresh);
  return handleResponse<T>(res);
}
