import { apiRequest } from "./client";
import type {
  ApiTokenCreated,
  ApiTokenRegisterGrant,
  ApiTokenScope,
  ApiTokenSummary,
} from "./types";

export interface ApiTokenInput {
  name?: string;
  scopes?: ApiTokenScope[];
  assigned_user_id?: number | null;
  /** Omit to leave register restrictions untouched (update only); [] clears
   * them back to unrestricted; a non-empty list replaces them entirely. */
  registers?: ApiTokenRegisterGrant[];
}

export async function listApiTokens(): Promise<ApiTokenSummary[]> {
  const res = await apiRequest<{ data: ApiTokenSummary[] }>("/api-tokens");
  return res.data;
}

export async function createApiToken(
  input: Required<Pick<ApiTokenInput, "name" | "scopes">> &
    Omit<ApiTokenInput, "name" | "scopes">
): Promise<ApiTokenCreated> {
  const res = await apiRequest<{ data: ApiTokenCreated }>("/api-tokens", {
    method: "POST",
    body: input,
  });
  return res.data;
}

export async function updateApiToken(
  id: number,
  input: ApiTokenInput
): Promise<ApiTokenSummary> {
  const res = await apiRequest<{ data: ApiTokenSummary }>(`/api-tokens/${id}`, {
    method: "PUT",
    body: input,
  });
  return res.data;
}

export async function revokeApiToken(id: number, password: string): Promise<void> {
  await apiRequest<void>(`/api-tokens/${id}`, {
    method: "DELETE",
    body: { password },
  });
}
