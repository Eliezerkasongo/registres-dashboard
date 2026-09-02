"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import FileInput from "@/components/form/input/FileInput";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { fieldOptions, uploadEntryFile } from "@/lib/api/registers";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import type { Entry, Field, FieldOption } from "@/lib/api/types";
import React, { useEffect, useState } from "react";

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  registerId: number;
  fields: Field[];
  /** Existing entry being edited, or null when creating a new one. */
  entry: Entry | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

function buildInitialData(
  fields: Field[],
  entry: Entry | null
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    if (entry && field.key in entry.data) {
      data[field.key] = entry.data[field.key];
    } else {
      data[field.key] = field.type === "boolean" ? false : "";
    }
  }
  return data;
}

export default function EntryFormModal({
  isOpen,
  onClose,
  registerId,
  fields,
  entry,
  onSubmit,
}: EntryFormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [dynamicOptions, setDynamicOptions] = useState<Record<number, FieldOption[]>>({});

  useEffect(() => {
    if (!isOpen) return;
    const referenceFields = fields.filter((f) => f.type === "select" && f.source_register_id);
    referenceFields.forEach((field) => {
      fieldOptions(registerId, field.id)
        .then((options) => setDynamicOptions((prev) => ({ ...prev, [field.id]: options })))
        .catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, registerId]);

  async function handleFileChange(key: string, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploadingKey(key);
    setError(null);
    try {
      const { url } = await uploadEntryFile(registerId, file);
      setValue(key, url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible d'envoyer le fichier."
      );
    } finally {
      setUploadingKey(null);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitialData(fields, entry));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entry]);

  function setValue(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploadingKey !== null) {
      setError("Merci d'attendre la fin de l'envoi du fichier.");
      return;
    }
    for (const field of fields) {
      if (field.required && field.type !== "barcode") {
        const value = formData[field.key];
        const isEmpty =
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "");
        if (isEmpty) {
          setError(`Le champ "${field.label}" est obligatoire.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const raw = formData[field.key];
        if (field.type === "number") {
          payload[field.key] =
            raw === "" || raw === null || raw === undefined
              ? null
              : Number(raw);
        } else {
          payload[field.key] = raw;
        }
      }
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible d'enregistrer l'entrée."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl m-4 p-6 max-h-[90vh] overflow-y-auto"
    >
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        {entry ? "Modifier l'entrée" : "Nouvelle entrée"}
      </h4>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
        {sortedFields.map((field) => (
          <div key={field.id}>
            {field.type !== "boolean" && (
              <Label>
                {field.label}
                {field.required && (
                  <span className="text-error-500"> *</span>
                )}
              </Label>
            )}
            {field.type === "textarea" ? (
              <TextArea
                value={(formData[field.key] as string) ?? ""}
                onChange={(value) => setValue(field.key, value)}
              />
            ) : field.type === "boolean" ? (
              <Checkbox
                label={field.label + (field.required ? " *" : "")}
                checked={Boolean(formData[field.key])}
                onChange={(checked) => setValue(field.key, checked)}
              />
            ) : field.type === "select" ? (
              <Select
                options={
                  field.source_register_id
                    ? dynamicOptions[field.id] ?? []
                    : (field.options ?? []).map((opt) => ({ value: opt, label: opt }))
                }
                defaultValue={(formData[field.key] as string) ?? ""}
                onChange={(value) => setValue(field.key, value)}
              />
            ) : field.type === "barcode" ? (
              <div className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                {(formData[field.key] as string) || "Généré automatiquement à l'enregistrement"}
              </div>
            ) : field.type === "file" ? (
              <div>
                <FileInput
                  onChange={(e) => handleFileChange(field.key, e.target.files)}
                />
                {uploadingKey === field.key && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Envoi en cours...
                  </p>
                )}
                {uploadingKey !== field.key && formData[field.key] ? (
                  <a
                    href={resolveAssetUrl(formData[field.key] as string) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-brand-500 underline"
                  >
                    Voir le fichier actuel
                  </a>
                ) : null}
              </div>
            ) : (
              <Input
                type={field.type}
                defaultValue={(formData[field.key] as string | number) ?? ""}
                onChange={(e) => setValue(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
        {sortedFields.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ce registre n&apos;a pas encore de champs. Ajoutez-en dans
            l&apos;onglet &quot;Champs&quot;.
          </p>
        )}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
