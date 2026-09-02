import { apiRequest } from "./client";
import type { OrganizationSummary, PasswordResetResult } from "./types";

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const res = await apiRequest<{ data: OrganizationSummary[] }>(
    "/superadmin/tenants"
  );
  return res.data;
}

export async function resetOrganizationPassword(
  tenantId: number
): Promise<PasswordResetResult> {
  const res = await apiRequest<{ data: PasswordResetResult }>(
    `/superadmin/tenants/${tenantId}/reset-password`,
    { method: "POST" }
  );
  return res.data;
}
