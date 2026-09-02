"use client";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { importRegisterFromExcel } from "@/lib/api/registers";
import type { RegisterDetail } from "@/lib/api/types";
import React, { useState } from "react";

const ACCEPTED_EXTENSIONS = ".xlsx,.xls,.csv";

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (result: {
    register: RegisterDetail;
    entriesImported: number;
  }) => void;
}

function fileNameWithoutExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
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

  function resetAndClose() {
    setFile(null);
    setName("");
    setDescription("");
    setError(null);
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

  async function handleSubmit(e: React.FormEvent) {
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
      const result = await importRegisterFromExcel({
        name: name.trim(),
        description: description.trim() || undefined,
        file,
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
      className="max-w-lg m-4 p-6"
    >
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Importer depuis Excel
      </h4>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetAndClose}
          >
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Import en cours..." : "Importer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
