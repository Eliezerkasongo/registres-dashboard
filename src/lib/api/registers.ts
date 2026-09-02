import { apiDownload, apiRequest, apiUpload } from "./client";
import type {
  DeletedEntry,
  Entry,
  Field,
  FieldInput,
  FieldOption,
  ImportFieldOverrides,
  ImportPreview,
  ListMeta,
  RegisterDetail,
  RegisterSummary,
} from "./types";

export async function listRegisters(): Promise<RegisterSummary[]> {
  const res = await apiRequest<{ data: RegisterSummary[] }>("/registers");
  return res.data;
}

export async function listArchivedRegisters(): Promise<RegisterSummary[]> {
  const res = await apiRequest<{ data: RegisterSummary[] }>(
    "/registers/archived"
  );
  return res.data;
}

/** Parses the file and returns the auto-detected fields/rows without
 * creating anything, so the caller can let the user review each field's
 * type and configure modalités before the real import. */
export async function previewExcelImport(file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("file", file);

  return apiUpload<ImportPreview>("/registers/import-excel/preview", formData);
}

export async function importRegisterFromExcel(input: {
  name: string;
  description?: string;
  file: File;
  fieldOverrides?: ImportFieldOverrides;
}): Promise<{ data: RegisterDetail; entries_imported: number }> {
  const formData = new FormData();
  formData.append("name", input.name);
  if (input.description) formData.append("description", input.description);
  formData.append("file", input.file);
  if (input.fieldOverrides) {
    formData.append("field_overrides", JSON.stringify(input.fieldOverrides));
  }

  return apiUpload<{ data: RegisterDetail; entries_imported: number }>(
    "/registers/import-excel",
    formData
  );
}

export async function createRegister(input: {
  name: string;
  description?: string;
  icon?: string;
  fields: FieldInput[];
}): Promise<RegisterDetail> {
  const res = await apiRequest<{ data: RegisterDetail }>("/registers", {
    method: "POST",
    body: input,
  });
  return res.data;
}

export async function getRegister(id: number): Promise<RegisterDetail> {
  const res = await apiRequest<{ data: RegisterDetail }>(`/registers/${id}`);
  return res.data;
}

/**
 * Downloads the register's entries as an .xlsx file and saves it via the
 * browser (soft-deleted entries are excluded server-side). A plain link
 * can't carry the auth token, so this fetches the file as a Blob and
 * triggers the save through a throwaway object URL / anchor click.
 */
export async function exportRegister(id: number, slug: string): Promise<void> {
  const blob = await apiDownload(`/registers/${id}/export`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function updateRegister(
  id: number,
  input: {
    name?: string;
    description?: string;
    icon?: string;
    is_main?: boolean;
  }
): Promise<RegisterDetail> {
  const res = await apiRequest<{ data: RegisterDetail }>(`/registers/${id}`, {
    method: "PUT",
    body: input,
  });
  return res.data;
}

export async function archiveRegister(
  id: number,
  password: string
): Promise<void> {
  await apiRequest<void>(`/registers/${id}/archive`, {
    method: "POST",
    body: { password },
  });
}

export async function restoreRegister(id: number): Promise<RegisterDetail> {
  const res = await apiRequest<{ data: RegisterDetail }>(
    `/registers/${id}/restore`,
    { method: "POST" }
  );
  return res.data;
}

export async function deleteRegister(
  id: number,
  password: string,
  reason: string
): Promise<void> {
  await apiRequest<void>(`/registers/${id}`, {
    method: "DELETE",
    body: { password, reason },
  });
}

export async function addField(
  registerId: number,
  input: FieldInput
): Promise<Field> {
  const res = await apiRequest<{ data: Field }>(
    `/registers/${registerId}/fields`,
    { method: "POST", body: input }
  );
  return res.data;
}

export async function updateField(
  registerId: number,
  fieldId: number,
  input: Partial<FieldInput>
): Promise<Field> {
  const res = await apiRequest<{ data: Field }>(
    `/registers/${registerId}/fields/${fieldId}`,
    { method: "PUT", body: input }
  );
  return res.data;
}

export async function deleteField(
  registerId: number,
  fieldId: number
): Promise<void> {
  await apiRequest<void>(`/registers/${registerId}/fields/${fieldId}`, {
    method: "DELETE",
  });
}

export async function fieldOptions(
  registerId: number,
  fieldId: number
): Promise<FieldOption[]> {
  const res = await apiRequest<{ data: FieldOption[] }>(
    `/registers/${registerId}/fields/${fieldId}/options`
  );
  return res.data;
}

export async function listEntries(
  registerId: number,
  params: { page?: number; per_page?: number; search?: string } = {}
): Promise<{ data: Entry[]; meta: ListMeta }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  return apiRequest<{ data: Entry[]; meta: ListMeta }>(
    `/registers/${registerId}/entries${qs ? `?${qs}` : ""}`
  );
}

export async function createEntry(
  registerId: number,
  data: Record<string, unknown>
): Promise<Entry> {
  const res = await apiRequest<{ data: Entry }>(
    `/registers/${registerId}/entries`,
    { method: "POST", body: { data } }
  );
  return res.data;
}

export async function updateEntry(
  registerId: number,
  entryId: number,
  data: Record<string, unknown>
): Promise<Entry> {
  const res = await apiRequest<{ data: Entry }>(
    `/registers/${registerId}/entries/${entryId}`,
    { method: "PUT", body: { data } }
  );
  return res.data;
}

export async function deleteEntry(
  registerId: number,
  entryId: number,
  password: string,
  reason: string
): Promise<void> {
  await apiRequest<void>(`/registers/${registerId}/entries/${entryId}`, {
    method: "DELETE",
    body: { password, reason },
  });
}

export async function entryHistory(
  registerId: number
): Promise<DeletedEntry[]> {
  const res = await apiRequest<{ data: DeletedEntry[] }>(
    `/registers/${registerId}/entries/history`
  );
  return res.data;
}

export async function uploadEntryFile(
  registerId: number,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiUpload<{ url: string }>(
    `/registers/${registerId}/entries/upload`,
    formData
  );
}
