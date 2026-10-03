"use client";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";
import { Modal } from "@/components/ui/modal";
import { AnomalyTriangleIcon, ValidatedCheckIcon } from "@/components/registers/ValidationStatusIcons";
import { ListIcon } from "@/icons/index";
import type { AnomalySeverity, Entry, EntryAnomaly, Field } from "@/lib/api/types";
import React, { useEffect, useState } from "react";

interface EntryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
  /** All of the register's fields, in display order - not just the ones
   * that got their own column in the (capped) entries table. */
  fields: Field[];
  renderValue: (field: Field, entry: Entry) => React.ReactNode;
  /** Only ever called for a 'pending' entry - the button is hidden otherwise. */
  onValidate: (entry: Entry) => void;
}

const SEVERITY_LABEL: Record<AnomalySeverity, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
};

function SeverityBadge({ severity }: { severity: AnomalySeverity }) {
  if (severity === "high") {
    return (
      <Badge size="sm" variant="solid" color="error">
        Gravité {SEVERITY_LABEL[severity]}
      </Badge>
    );
  }
  if (severity === "medium") {
    return (
      <Badge size="sm" variant="solid" color="warning">
        Gravité {SEVERITY_LABEL[severity]}
      </Badge>
    );
  }
  return (
    <Badge size="sm" variant="light" color="warning">
      Gravité {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

function AnomalyRow({ anomaly }: { anomaly: EntryAnomaly }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
      <span className="mt-0.5 shrink-0 text-warning-500">
        <AnomalyTriangleIcon />
      </span>
      <div className="min-w-0">
        <SeverityBadge severity={anomaly.severity} />
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{anomaly.message}</p>
      </div>
    </div>
  );
}

export default function EntryViewModal({
  isOpen,
  onClose,
  entry,
  fields,
  renderValue,
  onValidate,
}: EntryViewModalProps) {
  const [certified, setCertified] = useState(false);

  // Reset the certification checkbox whenever a different entry is opened,
  // or the same one is reopened - it must be re-read/re-checked every time,
  // never remembered across entries or across a close/reopen.
  useEffect(() => {
    setCertified(false);
  }, [isOpen, entry?.id]);

  if (!entry) return null;

  const isPending = entry.validation_status === "pending";
  const hasAnomalies = entry.anomalies.length > 0;
  // Reading the anomalies is only meaningful, and only required, when there
  // are actually anomalies to read - a clean pending entry validates in one click.
  const canValidate = !hasAnomalies || certified;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl m-4 max-h-[90vh] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 pr-14 dark:border-gray-800 sm:pr-16">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
          <ListIcon />
        </span>
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Détail de l&apos;enregistrement
          </h4>
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">
            Enregistrement #{entry.id}
            {entry.updated_at &&
              ` · Mis à jour le ${new Date(entry.updated_at).toLocaleString("fr-FR")}`}
          </p>
        </div>
      </div>

      <div className="max-h-[calc(90vh-72px)] overflow-y-auto px-6 py-5">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => {
            const value = renderValue(field, entry);
            return (
              <div
                key={field.id}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{field.label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-gray-800 dark:text-gray-200">
                  {value || <span className="font-normal text-gray-400 dark:text-gray-600">—</span>}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isPending ? (
                <Badge size="md" variant="light" color="warning">
                  En attente de validation
                </Badge>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-medium text-success-600 dark:text-success-400">
                  <ValidatedCheckIcon />
                  Validé
                  {entry.validated_at &&
                    ` le ${new Date(entry.validated_at).toLocaleString("fr-FR")}`}
                </span>
              )}
            </div>
            {isPending && !hasAnomalies && (
              <Button type="button" size="sm" onClick={() => onValidate(entry)}>
                Valider cette entrée
              </Button>
            )}
          </div>

          {hasAnomalies && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {entry.anomalies.length} anomalie{entry.anomalies.length > 1 ? "s" : ""} détectée
                {entry.anomalies.length > 1 ? "s" : ""}
              </p>
              {entry.anomalies.map((anomaly, index) => (
                <AnomalyRow key={index} anomaly={anomaly} />
              ))}
            </div>
          )}

          {isPending && hasAnomalies && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              <label className="flex cursor-pointer items-start gap-2.5">
                <span className="mt-0.5">
                  <Checkbox checked={certified} onChange={setCertified} />
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Je certifie avoir lu les anomalies signalées ci-dessus et je valide cette entrée
                  malgré tout.
                </span>
              </label>
              <div className="flex justify-end">
                <Button type="button" size="sm" disabled={!canValidate} onClick={() => onValidate(entry)}>
                  Valider cette entrée
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
