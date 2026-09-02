"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { createRegister, getRegister, listRegisters } from "@/lib/api/registers";
import { ApiError } from "@/lib/api/client";
import type { FieldType, RegisterDetail, RegisterSummary } from "@/lib/api/types";
import { FIELD_TYPE_OPTIONS } from "@/lib/registers/fieldTypeOptions";
import { slugifyKey, uniqueKey } from "@/lib/utils/slugify";
import { PlusIcon, TrashBinIcon } from "@/icons";
import React, { useEffect, useState } from "react";

interface FieldRow {
  uid: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  useReference: boolean;
  sourceRegisterId: number | null;
  sourceFieldKey: string;
  sourceFieldOptions: { value: string; label: string }[];
}

function emptyRow(): FieldRow {
  return {
    uid: Math.random().toString(36).slice(2),
    label: "",
    type: "text",
    required: false,
    options: [""],
    useReference: false,
    sourceRegisterId: null,
    sourceFieldKey: "",
    sourceFieldOptions: [],
  };
}

interface CreateRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (register: RegisterDetail) => void;
}

export default function CreateRegisterModal({
  isOpen,
  onClose,
  onCreated,
}: CreateRegisterModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<FieldRow[]>([emptyRow()]);
  const [existingRegisters, setExistingRegisters] = useState<RegisterSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      listRegisters().then(setExistingRegisters).catch(() => undefined);
    }
  }, [isOpen]);

  function resetAndClose() {
    setStep(1);
    setName("");
    setDescription("");
    setRows([emptyRow()]);
    setError(null);
    onClose();
  }

  function updateRow(uid: string, patch: Partial<FieldRow>) {
    setRows((prev) =>
      prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(uid: string) {
    setRows((prev) => prev.filter((row) => row.uid !== uid));
  }

  function updateRowOption(uid: string, index: number, value: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.uid === uid
          ? { ...row, options: row.options.map((o, i) => (i === index ? value : o)) }
          : row
      )
    );
  }

  function addRowOption(uid: string) {
    setRows((prev) =>
      prev.map((row) => (row.uid === uid ? { ...row, options: [...row.options, ""] } : row))
    );
  }

  function removeRowOption(uid: string, index: number) {
    setRows((prev) =>
      prev.map((row) =>
        row.uid === uid
          ? { ...row, options: row.options.filter((_, i) => i !== index) }
          : row
      )
    );
  }

  async function selectSourceRegister(uid: string, registerId: number) {
    updateRow(uid, { sourceRegisterId: registerId, sourceFieldKey: "", sourceFieldOptions: [] });
    try {
      const detail = await getRegister(registerId);
      updateRow(uid, {
        sourceFieldOptions: detail.fields.map((f) => ({ value: f.key, label: f.label })),
      });
    } catch {
      // leave sourceFieldOptions empty; the user can retry by reselecting
    }
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom du registre est obligatoire.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanRows = rows.filter((row) => row.label.trim());
    for (const row of cleanRows) {
      if (row.type === "select" && !row.useReference && row.options.every((o) => !o.trim())) {
        setError(`Ajoutez au moins une modalité pour le champ "${row.label}".`);
        return;
      }
      if (row.type === "select" && row.useReference && (!row.sourceRegisterId || !row.sourceFieldKey)) {
        setError(`Choisissez le registre et le champ source pour "${row.label}".`);
        return;
      }
    }

    const usedKeys: string[] = [];

    setIsSubmitting(true);
    setError(null);
    try {
      const register = await createRegister({
        name: name.trim(),
        description: description.trim() || undefined,
        fields: cleanRows.map((row, index) => {
          const key = uniqueKey(slugifyKey(row.label), usedKeys);
          usedKeys.push(key);
          return {
            key,
            label: row.label.trim(),
            type: row.type,
            required: row.required,
            options:
              row.type === "select" && !row.useReference
                ? row.options.map((o) => o.trim()).filter(Boolean)
                : null,
            source_register_id: row.type === "select" && row.useReference ? row.sourceRegisterId : null,
            source_field_key: row.type === "select" && row.useReference ? row.sourceFieldKey : null,
            sort_order: index,
          };
        }),
      });
      onCreated(register);
      resetAndClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de créer le registre."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      className="max-w-2xl m-4 p-6 max-h-[90vh] overflow-y-auto"
    >
      <div className="mb-5 flex items-center gap-3">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Nouveau registre
        </h4>
        <span className="text-sm text-gray-400">Étape {step} / 2</span>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleNext} className="space-y-5">
          <div>
            <Label>
              Nom du registre <span className="text-error-500">*</span>
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
            <Button type="submit" size="sm">
              Suivant
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between">
            <Label className="mb-0">Champs du registre</Label>
            <Button type="button" size="sm" variant="outline" onClick={addRow} startIcon={<PlusIcon />}>
              Ajouter un champ
            </Button>
          </div>

          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.uid}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    checked={row.required}
                    onChange={(checked) => updateRow(row.uid, { required: checked })}
                  />
                  <span className="text-sm font-normal text-gray-700 dark:text-gray-400">
                    Contrainte : champ obligatoire
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Nom du champ</Label>
                    <Input
                      placeholder="ex: Nom complet"
                      defaultValue={row.label}
                      onChange={(e) => updateRow(row.uid, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type de champ</Label>
                    <Select
                      options={FIELD_TYPE_OPTIONS}
                      defaultValue={row.type}
                      onChange={(value) => updateRow(row.uid, { type: value as FieldType })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={() => removeRow(row.uid)}
                    className="flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-error-500"
                  >
                    <TrashBinIcon /> Retirer ce champ
                  </button>
                </div>
                {row.type === "select" && (
                  <div className="mt-2 flex items-center gap-3">
                    <Checkbox
                      checked={row.useReference}
                      onChange={(checked) => updateRow(row.uid, { useReference: checked })}
                    />
                    <span className="text-sm font-normal text-gray-700 dark:text-gray-400">
                      Utiliser les données d&apos;un autre registre comme modalités
                    </span>
                  </div>
                )}
                {row.type === "select" && row.useReference && (
                  <div className="mt-3 space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <div>
                      <Label>Registre source</Label>
                      <Select
                        options={existingRegisters.map((r) => ({ value: String(r.id), label: r.name }))}
                        placeholder="Choisir un registre"
                        defaultValue={row.sourceRegisterId ? String(row.sourceRegisterId) : ""}
                        onChange={(value) => selectSourceRegister(row.uid, Number(value))}
                      />
                    </div>
                    {row.sourceRegisterId && (
                      <div>
                        <Label>Champ source (valeur affichée)</Label>
                        <Select
                          options={row.sourceFieldOptions}
                          placeholder="Choisir un champ"
                          defaultValue={row.sourceFieldKey}
                          onChange={(value) => updateRow(row.uid, { sourceFieldKey: value })}
                        />
                      </div>
                    )}
                  </div>
                )}
                {row.type === "select" && !row.useReference && (
                  <div className="mt-4">
                    <Label>Modalités</Label>
                    <div className="space-y-2">
                      {row.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder={`Modalité ${index + 1} (si applicable)`}
                            defaultValue={option}
                            onChange={(e) => updateRowOption(row.uid, index, e.target.value)}
                          />
                          {row.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRowOption(row.uid, index)}
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
                      onClick={() => addRowOption(row.uid)}
                      className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
                    >
                      <PlusIcon /> Ajouter une modalité
                    </button>
                  </div>
                )}
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aucun champ pour l&apos;instant. Vous pourrez aussi en ajouter
                après la création du registre.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>
              Précédent
            </Button>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={resetAndClose}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Création..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
