"use client";
import RegisterWorkspace from "@/components/registers/RegisterWorkspace";
import Button from "@/components/ui/button/Button";
import { ApiError } from "@/lib/api/client";
import { listRegisters } from "@/lib/api/registers";
import type { RegisterSummary } from "@/lib/api/types";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function HomePage() {
  const [registers, setRegisters] = useState<RegisterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listRegisters()
      .then((data) => {
        if (!cancelled) setRegisters(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Impossible de charger les registres."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
        {error}
      </div>
    );
  }

  if (registers === null) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
    );
  }

  const mainRegister = registers.find((r) => r.is_main);

  if (!mainRegister) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
        <p className="mb-4 text-gray-500 dark:text-gray-400">
          {registers.length === 0
            ? "Vous n'avez pas encore de registre. Créez-en un pour commencer."
            : "Aucun registre principal n'est défini pour l'instant. Choisissez celui qui s'affichera ici."}
        </p>
        <Link href="/registers">
          <Button size="sm">Aller à Mes registres</Button>
        </Link>
      </div>
    );
  }

  return <RegisterWorkspace registerId={mainRegister.id} />;
}
