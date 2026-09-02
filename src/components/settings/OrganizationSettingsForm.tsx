"use client";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import FileInput from "@/components/form/input/FileInput";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { updateTenant, uploadTenantLogo } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import Image from "next/image";
import React, { useState } from "react";

export default function OrganizationSettingsForm() {
  const { tenant, updateTenant: setTenant } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(tenant?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoUrl = resolveAssetUrl(tenant?.logo_url ?? null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nom requis", "Le nom de l'organisation ne peut pas être vide.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateTenant({ name: name.trim() });
      setTenant(updated);
      toast.success("Organisation mise à jour");
    } catch (err) {
      toast.error(
        "Échec de la mise à jour",
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const updated = await uploadTenantLogo(file);
      setTenant(updated);
      toast.success("Logo mis à jour");
    } catch (err) {
      toast.error(
        "Échec de l'envoi",
        err instanceof ApiError ? err.message : "Impossible d'envoyer le logo."
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }

  return (
    <ComponentCard title="Organisation" desc="Nom et logo affichés dans toute la plateforme.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={logoUrl}
                  alt={tenant?.name ?? "Logo"}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </span>
            )}
            <div className="flex-1">
              <FileInput onChange={(e) => handleLogoChange(e.target.files)} />
              {isUploadingLogo && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Envoi en cours...</p>
              )}
            </div>
          </div>
        </div>
        <div>
          <Label>Nom de l&apos;organisation</Label>
          <Input defaultValue={name} onChange={(e) => setName(e.target.value)} />
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
