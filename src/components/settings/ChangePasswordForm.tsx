"use client";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/context/ToastContext";
import { updateMe } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import React, { useState } from "react";

export default function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Mot de passe trop court", "Il doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setIsSaving(true);
    try {
      await updateMe({
        current_password: currentPassword || undefined,
        new_password: newPassword,
      });
      toast.success("Mot de passe modifié");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        "Échec du changement",
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ComponentCard title="Mot de passe" desc="Laissez le mot de passe actuel vide si aucun mot de passe n'a encore été défini pour ce compte.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Mot de passe actuel</Label>
          <Input
            type="password"
            defaultValue={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>Nouveau mot de passe</Label>
          <Input
            type="password"
            defaultValue={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>Confirmer le nouveau mot de passe</Label>
          <Input
            type="password"
            defaultValue={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Changer le mot de passe"}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
