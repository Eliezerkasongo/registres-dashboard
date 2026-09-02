"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PasswordConfirmDialog from "@/components/registers/PasswordConfirmDialog";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api/client";
import {
  deleteRegister,
  listArchivedRegisters,
  restoreRegister,
} from "@/lib/api/registers";
import type { RegisterSummary } from "@/lib/api/types";
import React, { useEffect, useState } from "react";

export default function ArchivesPage() {
  const toast = useToast();
  const [registers, setRegisters] = useState<RegisterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RegisterSummary | null>(null);

  async function load() {
    try {
      setRegisters(await listArchivedRegisters());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de charger les archives."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRestore(register: RegisterSummary) {
    try {
      await restoreRegister(register.id);
      toast.success("Registre restauré", `"${register.name}" est de retour dans Mes registres.`);
      await load();
    } catch (err) {
      toast.error(
        "Restauration impossible",
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
    }
  }

  async function handleDelete(password: string, reason: string) {
    if (!pendingDelete) return;
    await deleteRegister(pendingDelete.id, password, reason);
    toast.success("Registre supprimé", `"${pendingDelete.name}" a été supprimé.`);
    setPendingDelete(null);
    await load();
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Archives" />

      {error && (
        <div className="mb-4 rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nom</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Entrées</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {registers === null ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : registers.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                    Aucun registre archivé.
                  </TableCell>
                </TableRow>
              ) : (
                registers.map((register, index) => (
                  <TableRow key={register.id}>
                    <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{index + 1}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">{register.name}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">{register.entries_count}</TableCell>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleRestore(register)}>
                          Restaurer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="!text-error-500 !ring-error-300 hover:!bg-error-50"
                          onClick={() => setPendingDelete(register)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PasswordConfirmDialog
        isOpen={pendingDelete !== null}
        title="Supprimer le registre"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" et ses ${pendingDelete.entries_count} entrée(s) seront masqués définitivement. Confirmez avec votre mot de passe et indiquez la raison.`
            : undefined
        }
        requireReason
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
