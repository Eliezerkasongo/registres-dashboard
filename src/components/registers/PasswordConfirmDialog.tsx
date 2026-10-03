"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import React, { useEffect, useState } from "react";

interface PasswordConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Shows a fixed "this cannot be undone" banner - reserved for actions
   * that have no way back, like permanently deleting an archived register. */
  irreversible?: boolean;
  /** When set, the user must retype this exact value (e.g. the register's
   * name) before the action can be confirmed - a GitHub-style delete guard.
   * Pasting into that field is blocked so it can't be filled from a copy of
   * the name shown on screen. */
  confirmValue?: string;
  confirmValueLabel?: string;
  onConfirm: (password: string) => Promise<void>;
  onClose: () => void;
}

export default function PasswordConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmer",
  irreversible = false,
  confirmValue,
  confirmValueLabel = "le nom",
  onConfirm,
  onClose,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [typedConfirmValue, setTypedConfirmValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setTypedConfirmValue("");
      setError(null);
    }
  }, [isOpen]);

  const confirmValueMismatch =
    confirmValue !== undefined && typedConfirmValue.trim() !== confirmValue;

  function blockClipboard(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
  }

  async function handleConfirm() {
    if (confirmValueMismatch) {
      setError(`Le texte saisi ne correspond pas à ${confirmValueLabel}.`);
      return;
    }
    if (!password) {
      setError("Le mot de passe est obligatoire.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(password);
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
      {irreversible && (
        <div className="mb-4 rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm font-medium text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          ⚠ Cette action est irréversible et ne pourra pas être annulée.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}
      {confirmValue !== undefined && (
        <div className="mb-4">
          <Label>
            Tapez {confirmValueLabel} (<span className="font-semibold">{confirmValue}</span>) pour confirmer{" "}
            <span className="text-error-500">*</span>
          </Label>
          <Input
            type="text"
            autoComplete="off"
            defaultValue={typedConfirmValue}
            onChange={(e) => setTypedConfirmValue(e.target.value)}
            onPaste={blockClipboard}
            onCopy={blockClipboard}
            onCut={blockClipboard}
          />
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
          disabled={isSubmitting || confirmValueMismatch}
        >
          {isSubmitting ? "..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
