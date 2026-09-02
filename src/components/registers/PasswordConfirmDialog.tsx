"use client";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import React, { useEffect, useState } from "react";

interface PasswordConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  requireReason?: boolean;
  confirmLabel?: string;
  onConfirm: (password: string, reason: string) => Promise<void>;
  onClose: () => void;
}

export default function PasswordConfirmDialog({
  isOpen,
  title,
  description,
  requireReason = false,
  confirmLabel = "Confirmer",
  onConfirm,
  onClose,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  async function handleConfirm() {
    if (!password) {
      setError("Le mot de passe est obligatoire.");
      return;
    }
    if (requireReason && !reason.trim()) {
      setError("La raison est obligatoire.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(password, reason.trim());
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
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
      {requireReason && (
        <div className="mb-4">
          <Label>
            Raison <span className="text-error-500">*</span>
          </Label>
          <TextArea rows={3} value={reason} onChange={setReason} />
        </div>
      )}
      <div className="mb-5">
        <Label>
          Votre mot de passe <span className="text-error-500">*</span>
        </Label>
        <Input
          type="password"
          defaultValue={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
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
          {isSubmitting ? "..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
