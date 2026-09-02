import type { FieldType } from "@/lib/api/types";

/** Shared <Select> options for choosing a Field's type, used by both the
 * register-creation field builder and the single-field add/edit form. */
export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Texte" },
  { value: "textarea", label: "Texte long" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Case à cocher" },
  { value: "select", label: "Liste déroulante" },
  { value: "email", label: "Email" },
  { value: "file", label: "Fichier" },
  { value: "barcode", label: "Code-barres" },
];
