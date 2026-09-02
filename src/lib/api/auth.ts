import { apiRequest, apiUpload } from "./client";
import { clearTokens, getRefreshToken, setTokens } from "./tokenStorage";
import type { AuthResponse, MeResponse, Tenant, User } from "./types";

function persistAuthResponse(response: AuthResponse): AuthResponse {
  setTokens(response.access_token, response.refresh_token);
  return response;
}

export async function registerTenant(input: {
  tenant_name: string;
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
  return persistAuthResponse(response);
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  return persistAuthResponse(response);
}

/**
 * Confirms the current user's password without touching the active
 * session - reuses /auth/login (no backend changes needed for a "confirm
 * with password" step anywhere in the app) but, unlike login(), never
 * calls persistAuthResponse, so the session's stored tokens are left
 * untouched. Throws ApiError (invalid_credentials) on a wrong password.
 */
export async function verifyPassword(
  email: string,
  password: string
): Promise<void> {
  await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiRequest<void>("/auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
        skipRefresh: true,
      });
    }
  } finally {
    clearTokens();
  }
}

export async function me(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/auth/me", { skipRefresh: false });
}

export async function updateMe(input: {
  name?: string;
  current_password?: string;
  new_password?: string;
}): Promise<User> {
  const res = await apiRequest<{ user: User }>("/auth/me", {
    method: "PATCH",
    body: input,
  });
  return res.user;
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await apiUpload<{ user: User }>("/auth/me/avatar", formData);
  return res.user;
}

export async function updateTenant(input: { name?: string }): Promise<Tenant> {
  const res = await apiRequest<{ data: Tenant }>("/tenant", {
    method: "PATCH",
    body: input,
  });
  return res.data;
}

export async function uploadTenantLogo(file: File): Promise<Tenant> {
  const formData = new FormData();
  formData.append("logo", file);
  const res = await apiUpload<{ data: Tenant }>("/tenant/logo", formData);
  return res.data;
}
