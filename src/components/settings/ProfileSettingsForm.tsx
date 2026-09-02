"use client";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import FileInput from "@/components/form/input/FileInput";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import AvatarText from "@/components/ui/avatar/AvatarText";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { updateMe, uploadAvatar } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import Image from "next/image";
import React, { useState } from "react";

export default function ProfileSettingsForm() {
  const { user, updateUser: setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarUrl = resolveAssetUrl(user?.avatar_url ?? null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nom requis", "Votre nom ne peut pas être vide.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateMe({ name: name.trim() });
      setUser(updated);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(
        "Échec de la mise à jour",
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error(
        "Échec de l'envoi",
        err instanceof ApiError ? err.message : "Impossible d'envoyer la photo."
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <ComponentCard title="Mon compte" desc="Votre nom et votre photo de profil.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Photo de profil</Label>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={avatarUrl}
                  alt={user?.name ?? "Avatar"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </span>
            ) : (
              <AvatarText name={user?.name ?? "?"} className="h-14 w-14" />
            )}
            <div className="flex-1">
              <FileInput onChange={(e) => handleAvatarChange(e.target.files)} />
              {isUploadingAvatar && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Envoi en cours...</p>
              )}
            </div>
          </div>
        </div>
        <div>
          <Label>Nom</Label>
          <Input defaultValue={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input defaultValue={user?.email ?? ""} disabled />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
