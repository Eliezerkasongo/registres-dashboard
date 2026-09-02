"use client";
import { Modal } from "@/components/ui/modal";
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg m-4 p-6 max-h-[90vh] overflow-y-auto">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Détail de l&apos;enregistrement
      </h4>
      <dl className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{field.label}</dt>
            <dd className="mt-0.5 break-words text-sm text-gray-700 dark:text-gray-300">
              {renderValue(field, entry) || <span className="text-gray-400 dark:text-gray-600">—</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
