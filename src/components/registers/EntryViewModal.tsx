"use client";
import { Modal } from "@/components/ui/modal";
import { ListIcon } from "@/icons/index";
import type { Entry, Field } from "@/lib/api/types";
import React from "react";

interface EntryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
  /** All of the register's fields, in display order - not just the ones
   * that got their own column in the (capped) entries table. */
  fields: Field[];
  renderValue: (field: Field, entry: Entry) => React.ReactNode;
}

export default function EntryViewModal({
  isOpen,
  onClose,
  entry,
  fields,
  renderValue,
}: EntryViewModalProps) {
  if (!entry) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl m-4 max-h-[90vh] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 pr-14 dark:border-gray-800 sm:pr-16">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
          <ListIcon className="h-5 w-5" />
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

      <dl className="grid max-h-[calc(90vh-72px)] grid-cols-1 gap-3 overflow-y-auto px-6 py-5 sm:grid-cols-2">
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
    </Modal>
  );
}
