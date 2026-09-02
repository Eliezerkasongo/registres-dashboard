"use client";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import React, { useState } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Supprimer",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md m-4 p-6">
      <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h4>
      {description && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          className="!bg-error-500 hover:!bg-error-600"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Suppression..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
