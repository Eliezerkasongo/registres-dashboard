"use client";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { importRegisterFromExcel, previewExcelImport } from "@/lib/api/registers";
import type {
  FieldType,
  ImportFieldOverrides,
  ImportPreview,
  RegisterDetail,
} from "@/lib/api/types";
import { PlusIcon, TrashBinIcon } from "@/icons";
import React, { useState } from "react";

const ACCEPTED_EXTENSIONS = ".xlsx,.xls,.csv";

/** "file" has no meaning for a spreadsheet cell (no upload data behind it),
 * so it's excluded from the review step's type picker - everything else
 * FieldFormModal offers is a valid choice here. */
const IMPORT_FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Texte" },
  { value: "textarea", label: "Texte long" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Case à cocher" },
  { value: "select", label: "Liste déroulante" },
  { value: "email", label: "Email" },
  { value: "barcode", label: "Code-barres" },
];

/** Max of distinct raw values worth suggesting as modalités - beyond that
 * the column almost certainly isn't a real categorical field, and pre-
 * filling hundreds of "options" would just bury the editor. */
const MAX_SUGGESTED_OPTIONS = 40;

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (result: {
    register: RegisterDetail;
    entriesImported: number;
  }) => void;
}

interface FieldConfig {
  type: FieldType;
  options: string[];
}

function fileNameWithoutExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

/** Distinct, trimmed, non-empty values seen in that column across the
 * parsed rows - used to pre-fill modalités when a column is switched to
 * "Liste déroulante" so the user edits a starting list instead of typing
 * every value by hand. "-" always comes first as the default modality, for
 * rows where that column was blank or for future entries left unset. */
function distinctValues(rows: ImportPreview["rows"], key: string): string[] {
  const seen = new Set<string>(["-"]);
  for (const row of rows) {
    const raw = row[key];
    if (raw === null || raw === undefined) continue;
    const value = String(raw).trim();
    if (value === "" || seen.has(value)) continue;
    seen.add(value);
    if (seen.size > MAX_SUGGESTED_OPTIONS) break;
  }
  return Array.from(seen);
}

export default function ImportExcelModal({
  isOpen,
  onClose,
  onImported,
}: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fieldConfigs, setFieldConfigs] = useState<Record<string, FieldConfig>>({});

  function resetAndClose() {
    setFile(null);
    setName("");
    setDescription("");
    setError(null);
    setPreview(null);
    setFieldConfigs({});
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    // Auto-prefill the name from the file's name (minus extension) the
    // first time a file is picked, but don't clobber a name the user has
    // already started typing themselves.
    if (selected && !name.trim()) {
      setName(fileNameWithoutExtension(selected.name));
    }
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner un fichier Excel ou CSV.");
      return;
    }
    if (!name.trim()) {
      setError("Le nom du registre est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await previewExcelImport(file);
      setPreview(result);
      setFieldConfigs(
        Object.fromEntries(
          result.fields.map((f) => [f.key, { type: f.type, options: [] }])
        )
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible d'analyser le fichier."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function setFieldType(key: string, type: FieldType) {
    setFieldConfigs((prev) => {
      const current = prev[key];
      const isNewlySelect = type === "select" && current?.type !== "select";
      return {
        ...prev,
        [key]: {
          type,
          options: isNewlySelect && preview
            ? distinctValues(preview.rows, key)
            : current?.options ?? [],
        },
      };
    });
  }

  function updateOption(key: string, index: number, value: string) {
    setFieldConfigs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: prev[key].options.map((o, i) => (i === index ? value : o)),
      },
    }));
  }

  function addOption(key: string) {
    setFieldConfigs((prev) => ({
      ...prev,
      [key]: { ...prev[key], options: [...prev[key].options, ""] },
    }));
  }

  function removeOption(key: string, index: number) {
    setFieldConfigs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        options: prev[key].options.filter((_, i) => i !== index),
      },
    }));
  }

  async function handleImport() {
    if (!file || !preview) return;

    const cleanErrors: string[] = [];
    const fieldOverrides: ImportFieldOverrides = {};
    for (const f of preview.fields) {
      const config = fieldConfigs[f.key];
      if (!config) continue;
      const cleanOptions = config.options.map((o) => o.trim()).filter(Boolean);
      if (config.type === "select" && cleanOptions.length === 0) {
        cleanErrors.push(`Ajoutez au moins une modalité pour "${f.label}".`);
        continue;
      }
      fieldOverrides[f.key] = {
        type: config.type,
        options: config.type === "select" ? cleanOptions : undefined,
      };
    }
    if (cleanErrors.length > 0) {
      setError(cleanErrors[0]);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await importRegisterFromExcel({
        name: name.trim(),
        description: description.trim() || undefined,
        file,
        fieldOverrides,
      });
      onImported({
        register: result.data,
        entriesImported: result.entries_imported,
      });
      resetAndClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible d'importer le fichier."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      className={preview ? "max-w-2xl m-4 p-6 max-h-[90vh] overflow-y-auto" : "max-w-lg m-4 p-6"}
    >
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Importer depuis Excel
      </h4>

      {error && (
        <div className="mb-5 rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      {!preview ? (
        <form onSubmit={handleNext} className="space-y-5">
          <div>
            <Label>
              Fichier <span className="text-error-500">*</span>
            </Label>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-400 dark:file:bg-white/5 dark:file:text-white/90 dark:hover:file:bg-white/10"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Formats acceptés : .xlsx, .xls, .csv
            </p>
          </div>
          <div>
            <Label>
              Nom <span className="text-error-500">*</span>
            </Label>
            <Input
              placeholder="ex: Registre du personnel"
              defaultValue={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <TextArea
              rows={2}
              value={description}
              onChange={setDescription}
              placeholder="Description du registre (optionnel)"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={resetAndClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Analyse en cours..." : "Suivant"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {preview.fields.length} colonne(s) détectée(s), {preview.rows.length} ligne(s) à
            importer. Ajustez le type de chaque champ et, pour une liste déroulante,
            les modalités proposées (pré-remplies à partir des valeurs du fichier).
          </p>

          <div className="space-y-4">
            {preview.fields.map((f) => {
              const config = fieldConfigs[f.key];
              if (!config) return null;
              return (
                <div key={f.key} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {f.label}
                    </span>
                    <div className="w-52">
                      <Select
                        options={IMPORT_FIELD_TYPE_OPTIONS}
                        defaultValue={config.type}
                        onChange={(value) => setFieldType(f.key, value as FieldType)}
                      />
                    </div>
                  </div>

                  {config.type === "select" && (
                    <div className="mt-3">
                      <Label>Modalités</Label>
                      <div className="space-y-2">
                        {config.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              placeholder={`Modalité ${index + 1}`}
                              defaultValue={option}
                              onChange={(e) => updateOption(f.key, index, e.target.value)}
                            />
                            {config.options.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOption(f.key, index)}
                                className="text-gray-400 hover:text-error-500"
                                aria-label="Supprimer cette modalité"
                              >
                                <TrashBinIcon />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addOption(f.key)}
                        className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
                      >
                        <PlusIcon /> Ajouter une modalité
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPreview(null);
                setFieldConfigs({});
              }}
            >
              Retour
            </Button>
            <Button type="button" size="sm" disabled={isSubmitting} onClick={handleImport}>
              {isSubmitting ? "Import en cours..." : "Importer"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
