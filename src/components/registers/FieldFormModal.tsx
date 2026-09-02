"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { getRegister, listRegisters } from "@/lib/api/registers";
import type { Field, FieldInput, FieldType, RegisterSummary } from "@/lib/api/types";
import { FIELD_TYPE_OPTIONS } from "@/lib/registers/fieldTypeOptions";
import { slugifyKey } from "@/lib/utils/slugify";
import { PlusIcon, TrashBinIcon } from "@/icons";
import React, { useEffect, useState } from "react";

interface FieldFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Existing field being edited, or null when creating a new one. */
  field: Field | null;
  /** Excluded from the "source register" picker - a register can't reference itself. */
  currentRegisterId: number;
  onSubmit: (input: FieldInput) => Promise<void>;
}

export default function FieldFormModal({
  isOpen,
  onClose,
  field,
  currentRegisterId,
  onSubmit,
}: FieldFormModalProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [useReference, setUseReference] = useState(false);
  const [otherRegisters, setOtherRegisters] = useState<RegisterSummary[]>([]);
  const [sourceRegisterId, setSourceRegisterId] = useState<number | null>(null);
  const [sourceFieldOptions, setSourceFieldOptions] = useState<{ value: string; label: string }[]>([]);
  const [sourceFieldKey, setSourceFieldKey] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLabel(field?.label ?? "");
      setType(field?.type ?? "text");
      setRequired(field?.required ?? false);
      setOptions(field?.options && field.options.length > 0 ? field.options : [""]);
      setUseReference(!!field?.source_register_id);
      setSourceRegisterId(field?.source_register_id ?? null);
      setSourceFieldKey(field?.source_field_key ?? "");
      setError(null);
      listRegisters()
        .then((rows) => setOtherRegisters(rows.filter((r) => r.id !== currentRegisterId)))
        .catch(() => undefined);
    }
  }, [isOpen, field, currentRegisterId]);

  useEffect(() => {
    if (!sourceRegisterId) {
      setSourceFieldOptions([]);
      return;
    }
    getRegister(sourceRegisterId)
      .then((detail) =>
        setSourceFieldOptions(detail.fields.map((f) => ({ value: f.key, label: f.label })))
      )
      .catch(() => setSourceFieldOptions([]));
  }, [sourceRegisterId]);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError("Le nom du champ est obligatoire.");
      return;
    }
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (type === "select" && !useReference && cleanOptions.length === 0) {
      setError("Ajoutez au moins une modalité pour ce champ.");
      return;
    }
    if (type === "select" && useReference && (!sourceRegisterId || !sourceFieldKey)) {
      setError("Choisissez le registre et le champ source.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        key: field?.key ?? slugifyKey(label),
        label: label.trim(),
        type,
        required,
        options: type === "select" && !useReference ? cleanOptions : null,
        source_register_id: type === "select" && useReference ? sourceRegisterId : null,
        source_field_key: type === "select" && useReference ? sourceFieldKey : null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible d'enregistrer le champ."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg m-4 p-6">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        {field ? "Modifier le champ" : "Ajouter un champ"}
      </h4>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Checkbox checked={required} onChange={setRequired} />
          <span className="text-sm font-normal text-gray-700 dark:text-gray-400">
            Contrainte : champ obligatoire
          </span>
        </div>
        <div>
          <Label>
            Nom du champ <span className="text-error-500">*</span>
          </Label>
          <Input
            placeholder="ex: Date de naissance"
            defaultValue={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <Label>Type de champ</Label>
          <Select
            options={FIELD_TYPE_OPTIONS}
            defaultValue={type}
            onChange={(value) => setType(value as FieldType)}
          />
        </div>
        {type === "select" && (
          <div className="flex items-center gap-3">
            <Checkbox checked={useReference} onChange={setUseReference} />
            <span className="text-sm font-normal text-gray-700 dark:text-gray-400">
              Utiliser les données d&apos;un autre registre comme modalités
            </span>
          </div>
        )}
        {type === "select" && useReference && (
          <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div>
              <Label>Registre source</Label>
              <Select
                options={otherRegisters.map((r) => ({ value: String(r.id), label: r.name }))}
                placeholder="Choisir un registre"
                defaultValue={sourceRegisterId ? String(sourceRegisterId) : ""}
                onChange={(value) => {
                  setSourceRegisterId(Number(value));
                  setSourceFieldKey("");
                }}
              />
            </div>
            {sourceRegisterId && (
              <div>
                <Label>Champ source (valeur affichée)</Label>
                <Select
                  options={sourceFieldOptions}
                  placeholder="Choisir un champ"
                  defaultValue={sourceFieldKey}
                  onChange={setSourceFieldKey}
                />
              </div>
            )}
          </div>
        )}
        {type === "select" && !useReference && (
          <div>
            <Label>Modalités</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Modalité ${index + 1} (si applicable)`}
                    defaultValue={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
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
              onClick={addOption}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              <PlusIcon /> Ajouter une modalité
            </button>
          </div>
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
