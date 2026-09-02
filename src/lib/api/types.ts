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

export interface Entry {
  id: number;
  register_id: number;
  data: Record<string, unknown>;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeletedEntry extends Entry {
  deleted_by: number | null;
  deletion_reason: string | null;
  deleted_at: string | null;
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
