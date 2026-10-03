"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { entryTrash, listDeletedRegisters } from "@/lib/api/registers";
import type { DeletedEntry, RegisterSummary } from "@/lib/api/types";
import React, { useEffect, useState } from "react";

/** Read-only trash: registers and entries deleted for good, with no restore
 * action anywhere on this page - that's what tells it apart from Archives. */
export default function CorbeillePage() {
  const [registers, setRegisters] = useState<RegisterSummary[] | null>(null);
  const [entries, setEntries] = useState<DeletedEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [deletedRegisters, deletedEntries] = await Promise.all([
          listDeletedRegisters(),
          entryTrash(),
        ]);
        setRegisters(deletedRegisters);
        setEntries(deletedEntries);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Impossible de charger la corbeille."
        );
      }
    })();
  }, []);

  return (
    <div>
      <PageBreadcrumb pageTitle="Corbeille" />

      {error && (
        <div className="mb-4 rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Éléments supprimés définitivement, conservés pour la traçabilité uniquement - aucune restauration possible.
      </p>

      <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
        Registres supprimés
      </h3>
      <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Nom</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Entrées</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supprimé le</TableCell>
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
                    Aucun registre supprimé.
                  </TableCell>
                </TableRow>
              ) : (
                registers.map((register, index) => (
                  <TableRow key={register.id}>
                    <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{index + 1}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">{register.name}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">{register.entries_count}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                      {register.deleted_at ? new Date(register.deleted_at).toLocaleString("fr-FR") : ""}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
        Entrées supprimées
      </h3>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Registre</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Contenu</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supprimé le</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {entries === null ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                    Aucune entrée supprimée.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{index + 1}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">{entry.register_name ?? "-"}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                      {Object.values(entry.data).filter(Boolean).map(String).join(" · ")}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                      {entry.deleted_at ? new Date(entry.deleted_at).toLocaleString("fr-FR") : ""}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
