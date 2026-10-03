"use client";
import Switch from "@/components/form/switch/Switch";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api/client";
import { listRegisterVisibility, setRegisterVisibility } from "@/lib/api/registers";
import type { RegisterVisibilityGrant } from "@/lib/api/types";
import React, { useEffect, useState } from "react";

/**
 * Admin-only: by default a `member` only sees the entries they created
 * themselves in this register - here the admin opens (or closes) a given
 * colleague's access to every entry instead. Never applies to another
 * admin, who always sees everything already.
 */
export default function RegisterVisibilityPanel({ registerId }: { registerId: number }) {
  const toast = useToast();
  const [grants, setGrants] = useState<RegisterVisibilityGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function reload() {
    setIsLoading(true);
    listRegisterVisibility(registerId)
      .then(setGrants)
      .catch(() => toast.error("Erreur", "Impossible de charger la visibilité de ce registre."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerId]);

  async function handleToggle(grant: RegisterVisibilityGrant, canViewAll: boolean) {
    try {
      await setRegisterVisibility(registerId, grant.user_id, canViewAll);
      setGrants((prev) =>
        prev.map((g) => (g.user_id === grant.user_id ? { ...g, can_view_all: canViewAll } : g))
      );
      toast.success(
        canViewAll
          ? `${grant.name} voit désormais toutes les entrées de ce registre.`
          : `${grant.name} ne voit plus que ses propres entrées.`
      );
    } catch (err) {
      toast.error(
        "Échec de la mise à jour",
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Par défaut, un membre ne voit que les entrées qu&apos;il a lui-même collectées dans ce
        registre. Activez l&apos;accès ci-dessous pour qu&apos;un membre voie toutes les entrées.
        Les admins voient toujours tout, quel que soit ce réglage.
      </p>
      <div className="space-y-3">
        {grants.map((grant) => (
          <div
            key={grant.user_id}
            className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-800 dark:text-white/90">{grant.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{grant.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {grant.role === "admin" ? (
                <Badge size="sm" color="primary">
                  Admin (voit tout)
                </Badge>
              ) : (
                <Switch
                  label="Voit tout"
                  defaultChecked={grant.can_view_all}
                  onChange={(checked) => handleToggle(grant, checked)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
