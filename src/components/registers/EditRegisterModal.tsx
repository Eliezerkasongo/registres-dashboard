"use client";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { updateRegister } from "@/lib/api/registers";
import type { RegisterDetail } from "@/lib/api/types";
import React, { useEffect, useState } from "react";

interface EditRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: RegisterDetail;
  onUpdated: (register: RegisterDetail) => void;
}

export default function EditRegisterModal({
  isOpen,
  onClose,
  register,
  onUpdated,
}: EditRegisterModalProps) {
  const [name, setName] = useState(register.name);
  const [description, setDescription] = useState(register.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(register.name);
      setDescription(register.description ?? "");
      setError(null);
    }
  }, [isOpen, register]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom du registre est obligatoire.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updateRegister(register.id, {
        name: name.trim(),
        description: description.trim(),
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de mettre à jour le registre."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg m-4 p-6">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Modifier le registre
      </h4>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
        <div>
          <Label>
            Nom <span className="text-error-500">*</span>
          </Label>
          <Input defaultValue={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <TextArea rows={3} value={description} onChange={setDescription} />
        </div>
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
