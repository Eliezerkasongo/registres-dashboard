"use client";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import type { Entry, Field } from "@/lib/api/types";
import Image from "next/image";
import React, { useEffect } from "react";

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
  const { tenant } = useAuth();
  const logoUrl = resolveAssetUrl(tenant?.logo_url ?? null);

  // Browsers that print their own title/date header (the "headers and
  // footers" print-dialog option) pull it straight from document.title -
  // swap the app's generic "Support Logistique" for the register's own
  // name while this preview is open, and restore it on close.
  useEffect(() => {
    if (!isOpen) return;
    const previousTitle = document.title;
    document.title = registerName;
    return () => {
      document.title = previousTitle;
    };
  }, [isOpen, registerName]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl m-4 p-6 max-h-[90vh] overflow-y-auto">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm 10mm 16mm 10mm;
            /* Progressive enhancement: recent Chromium/Firefox releases
             * render @page margin boxes, so this shows "1 / 3" style page
             * numbers on every printed page. Older engines just ignore it -
             * the browser's own print dialog "headers and footers" option
             * is the guaranteed fallback for page numbers either way. */
            @bottom-center {
              content: counter(page) " / " counter(pages);
              font-size: 8px;
              color: #6b7280;
            }
          }
          /* position: fixed (not absolute) on the print area was the actual
           * cause of the whole header+table repeating on every page: in
           * paged/print media, a fixed-position element is defined to
           * render on EVERY page, the same as a running header - exactly
           * the bug reported. Forcing every other element to position:
           * static removes any nested positioned ancestor (the modal card
           * itself is set to relative), so #print-preview-area's own
           * absolute positioning below resolves against the actual page
           * box instead - a normal, one-time, page-breaking-as-usual
           * element. */
          body * { visibility: hidden; position: static !important; }
          #print-preview-area, #print-preview-area * { visibility: visible; }
          #print-preview-area {
            position: absolute !important;
            top: 0; left: 0;
            width: 100%; margin: 0; padding: 0;
            background: white;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          /* Some browsers skip background colors when printing unless told
           * otherwise - without this the gray header row would print white. */
          #print-preview-area * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
          /* Without this, a row landing right on a page boundary can get
           * split mid-row - its bottom half bleeding onto the next page
           * and visually blending with whatever starts there. */
          #print-preview-area tr {
            break-inside: avoid;
            page-break-inside: avoid;
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

      {/* Mimics a real print-preview: a black tray behind a plain white A4
       * "sheet", so the page is visually obvious regardless of the app's
       * own light/dark theme. Only #print-preview-area itself is actually
       * sent to the printer (see the print CSS above). */}
      <div className="rounded-lg bg-black p-6 print:bg-transparent print:p-0">
        <div id="print-preview-area" className="mx-auto overflow-x-auto rounded-sm bg-white p-4 shadow-lg">
          {/* Letterhead - only ever appears once, at the top of page 1. Just
           * the logo (no tenant/org name text) and the register name - the
           * date/time is whatever the browser's own print header shows, if
           * enabled, so it isn't duplicated here. */}
          <div className="mb-3 flex items-end justify-between border-b-2 border-gray-800 pb-2">
            {logoUrl ? (
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded">
                <Image src={logoUrl} alt={tenant?.name ?? "Logo"} fill unoptimized className="object-contain" />
              </span>
            ) : (
              <span />
            )}
            <div className="text-right">
              <div className="text-base font-bold text-black">{registerName}</div>
              <div className="text-[10px] text-gray-500">
                {entries.length} enregistrement{entries.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <table className="w-full border-collapse text-left text-xs text-black">
            {/* A plain <tr> in <tbody> rather than a real <thead> - Chromium
             * repeats an actual <thead> on every printed page regardless of
             * its CSS display value, and this row must only appear once. */}
            <tbody>
              <tr>
                <th className="w-6 border border-gray-300 bg-gray-200 px-2 py-1 font-semibold text-gray-700">
                  N°
                </th>
                {fields.map((field) => (
                  <th
                    key={field.id}
                    className="border border-gray-300 bg-gray-200 px-2 py-1 font-semibold text-gray-700"
                  >
                    {field.label}
                  </th>
                ))}
              </tr>
              {entries.map((entry, index) => (
                <tr key={entry.id}>
                  <td className="border border-gray-300 px-2 py-1 text-gray-500">{index + 1}</td>
                  {fields.map((field) => (
                    <td key={field.id} className="border border-gray-300 px-2 py-1">
                      {resolveText(field, entry.data[field.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td className="border border-gray-300 px-2 py-4 text-center text-gray-500" colSpan={fields.length + 1}>
                    Aucune entrée à imprimer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
