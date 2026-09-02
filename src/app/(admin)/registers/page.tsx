"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CreateRegisterModal from "@/components/registers/CreateRegisterModal";
import ImportExcelModal from "@/components/registers/ImportExcelModal";
import RegisterCard from "@/components/registers/RegisterCard";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api/client";
import { listRegisters, updateRegister } from "@/lib/api/registers";
import type { RegisterSummary } from "@/lib/api/types";
import { FileIcon, PlusIcon } from "@/icons";
import React, { useEffect, useState } from "react";

export default function RegistersPage() {
  const toast = useToast();
  const [registers, setRegisters] = useState<RegisterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  async function loadRegisters() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listRegisters();
      setRegisters(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de charger les registres."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetMain(register: RegisterSummary) {
    try {
      await updateRegister(register.id, { is_main: true });
      toast.success("Registre principal défini", `"${register.name}" s'affichera désormais sur Home.`);
      await loadRegisters();
    } catch (err) {
      toast.error(
        "Action impossible",
        err instanceof ApiError ? err.message : "Impossible de définir ce registre comme principal."
      );
    }
  }

  useEffect(() => {
    loadRegisters();
  }, []);

  return (
    <div>
      <PageBreadcrumb pageTitle="Registres" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gérez vos registres personnalisés et leurs entrées.
        </p>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            startIcon={<FileIcon />}
            onClick={() => setIsImportOpen(true)}
          >
            Importer depuis Excel
          </Button>
          <Button
            size="sm"
            startIcon={<PlusIcon />}
            onClick={() => setIsCreateOpen(true)}
          >
            Nouveau registre
          </Button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      {!isLoading && !error && registers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            Aucun registre pour l&apos;instant. Créez-en un pour commencer.
          </p>
        </div>
      )}

      {!isLoading && !error && registers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registers.map((register) => (
            <RegisterCard
              key={register.id}
              register={register}
              onSetMain={handleSetMain}
            />
          ))}
        </div>
      )}

      <CreateRegisterModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(register) => {
          toast.success("Registre créé", `"${register.name}" a été créé.`);
          loadRegisters();
        }}
      />

      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={({ register, entriesImported }) => {
          toast.success(
            "Import réussi",
            `Registre "${register.name}" importé avec succès (${entriesImported} ${
              entriesImported > 1 ? "entrées importées" : "entrée importée"
            }).`
          );
          loadRegisters();
        }}
      />
    </div>
  );
}
