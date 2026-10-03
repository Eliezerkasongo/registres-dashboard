export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member" | "superadmin";
  avatar_url: string | null;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
}

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "email"
  | "file"
  | "barcode";

export interface Field {
  id: number;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[] | null;
  sort_order: number;
  source_register_id: number | null;
  source_field_key: string | null;
}

export interface FieldInput {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[] | null;
  sort_order?: number;
  source_register_id?: number | null;
  source_field_key?: string | null;
}

export interface FieldOption {
  value: string;
  label: string;
}

/** One auto-detected column from the Excel/CSV import preview - not yet a
 * real Field (no id/options), just what parsing inferred. */
export interface ImportPreviewField {
  key: string;
  label: string;
  type: FieldType;
  sort_order: number;
}

export interface ImportPreview {
  fields: ImportPreviewField[];
  rows: Record<string, string | number | null>[];
}

/** Per-column choices made in the import review step, sent back to the
 * server so the real import applies them instead of the raw inferred type. */
export type ImportFieldOverrides = Record<
  string,
  { type: FieldType; options?: string[] }
>;

export interface RegisterSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_main: boolean;
  is_archived: boolean;
  fields_count: number;
  entries_count: number;
  created_at: string;
  /** Only present on the trash listing (listDeletedRegisters()). */
  deleted_at?: string | null;
  deletion_reason?: string | null;
}

export interface RegisterDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_main: boolean;
  is_archived: boolean;
  fields: Field[];
  entries_count: number;
  created_at: string;
  updated_at: string;
}

export type AnomalySeverity = "low" | "medium" | "high";

/** field_key null = concerns the whole entry (e.g. an exact duplicate),
 * rather than one specific column. */
export interface EntryAnomaly {
  field_key: string | null;
  rule: string;
  severity: AnomalySeverity;
  message: string;
}

export interface Entry {
  id: number;
  register_id: number;
  data: Record<string, unknown>;
  /** Every entry starts 'pending' regardless of source, until a human
   * validates it - only then can it be used as a cross-register reference. */
  validation_status: "pending" | "validated";
  validated_at: string | null;
  validated_by: number | null;
  /** Detected automatically at write time, re-evaluated on every edit. */
  anomalies: EntryAnomaly[];
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeletedEntry extends Entry {
  deleted_by: number | null;
  deletion_reason: string | null;
  deleted_at: string | null;
  /** Only present on the cross-register trash listing (entryTrash()). */
  register_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  tenant: Tenant;
}

export interface MeResponse {
  user: User;
  tenant: Tenant;
}

export interface ListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export type ApiTokenScope = "registers:read" | "registers:write";

/** One register this token is restricted to (only present when the token
 * has any restriction at all - see ApiTokenSummary.registers). A null
 * fields_read/fields_write means every field is allowed for that action -
 * they're independent, so a token can read a column it can't write. */
export interface ApiTokenRegisterGrant {
  register_id: number;
  can_read: boolean;
  can_write: boolean;
  fields_read: string[] | null;
  fields_write: string[] | null;
}

export interface ApiTokenAssignedUser {
  id: number;
  name: string;
  email: string;
}

export interface ApiTokenSummary {
  id: number;
  name: string;
  token_prefix: string;
  scopes: ApiTokenScope[];
  /** Audit/attribution only - purely a label, never changes what the token can do. */
  assigned_user: ApiTokenAssignedUser | null;
  /** Empty = unrestricted (any register the flat scopes above allow). */
  registers: ApiTokenRegisterGrant[];
  last_used_at: string | null;
  created_at: string;
}

/** Only returned once, right after creation - the full secret is never
 * retrievable again afterwards (only its hash is stored server-side). */
export interface ApiTokenCreated extends ApiTokenSummary {
  token: string;
}

/** One tenant member's "see every entry" status for a given register -
 * without it (can_view_all false) a `member` only sees entries they created
 * themselves. Never applies to an admin, who always sees everything. */
export interface RegisterVisibilityGrant {
  user_id: number;
  name: string;
  email: string;
  role: "admin" | "member";
  can_view_all: boolean;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
  is_active: boolean;
  created_at: string;
}

/** Only returned once, right after inviting - the plaintext temporary
 * password is never retrievable again afterwards. */
export interface TeamMemberInvited extends TeamMember {
  temporary_password: string;
}

export interface OrganizationSummary {
  id: number;
  name: string;
  slug: string;
  admin_email: string | null;
  created_at: string;
}

export interface PasswordResetResult {
  tenant_name: string;
  admin_email: string;
  temporary_password: string;
}
