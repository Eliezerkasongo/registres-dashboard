"use client";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { Entry, Field } from "@/lib/api/types";
import React from "react";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  registerName: string;
  fields: Field[];
  entries: Entry[];
  /** Plain-text resolution of a field's value (labels for reference
   * selects, "Oui"/"Non" for booleans, etc.) - print output is text-only,
   * no badges/links. */
  resolveText: (field: Field, raw: unknown) => string;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  registerName,
  fields,
  entries,
  resolveText,
}: PrintPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl m-4 p-6 max-h-[90vh] overflow-y-auto">
      <style>{`
        @media print {
          @page { size: landscape; margin: 8mm; }
          body * { visibility: hidden; }
          #print-preview-area, #print-preview-area * { visibility: visible; }
          #print-preview-area {
            position: fixed; top: 0; left: 0;
            width: 100%; margin: 0; padding: 0;
            background: white;
          }
          /* Every column must fit on one landscape page, no matter how many
           * there are - a fixed table forces them to share the full width
           * instead of overflowing, and the text/padding shrink as far as
           * needed to stay legible at that width. */
          #print-preview-area table {
            table-layout: fixed;
            width: 100% !important;
            font-size: 6px;
          }
          #print-preview-area th,
          #print-preview-area td {
            padding: 1px 2px !important;
            overflow-wrap: break-word;
            word-break: break-word;
          }
        }
      `}</style>

      <div className="mb-4 flex items-center justify-between pr-12 sm:pr-14">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Aperçu avant impression ({entries.length})
        </h4>
        <Button type="button" size="sm" onClick={() => window.print()}>
          Imprimer / Exporter en PDF
        </Button>
      </div>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Format paysage - toutes les colonnes tiennent sur une page, quitte à réduire
        fortement le texte et les marges si elles sont nombreuses.
      </p>

      <div id="print-preview-area" className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full border-collapse text-left text-xs text-black">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 px-2 py-1 font-semibold" colSpan={fields.length}>
                {registerName} - {new Date().toLocaleDateString("fr-FR")}
              </th>
            </tr>
            <tr>
              {fields.map((field) => (
                <th key={field.id} className="border border-gray-300 bg-gray-50 px-2 py-1 font-medium">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                {fields.map((field) => (
                  <td key={field.id} className="border border-gray-300 px-2 py-1">
                    {resolveText(field, entry.data[field.key])}
                  </td>
                ))}
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className="border border-gray-300 px-2 py-4 text-center text-gray-500" colSpan={fields.length}>
                  Aucune entrée à imprimer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
