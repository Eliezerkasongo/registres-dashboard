import { apiRequest } from "./client";
import type { TeamMember, TeamMemberInvited } from "./types";

export async function listTeam(): Promise<TeamMember[]> {
  const res = await apiRequest<{ data: TeamMember[] }>("/team");
  return res.data;
}

export async function inviteTeamMember(input: {
  name: string;
  email: string;
  role: "admin" | "member";
}): Promise<TeamMemberInvited> {
  const res = await apiRequest<{ data: TeamMemberInvited }>("/team", {
    method: "POST",
    body: input,
  });
  return res.data;
}

export async function updateTeamMember(
  id: number,
  input: { name?: string; email?: string; role?: "admin" | "member"; is_active?: boolean }
): Promise<TeamMember> {
  const res = await apiRequest<{ data: TeamMember }>(`/team/${id}`, {
    method: "PUT",
    body: input,
  });
  return res.data;
}

/** Removes a colleague from the team for good (not just deactivating them) -
 * hidden from every listing afterwards, no restore route. */
export async function deleteTeamMember(id: number, password: string): Promise<void> {
  await apiRequest<void>(`/team/${id}`, {
    method: "DELETE",
    body: { password },
  });
}
