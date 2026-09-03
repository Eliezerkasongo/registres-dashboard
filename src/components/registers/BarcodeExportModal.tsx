"use client";
import Barcode128 from "@/components/registers/Barcode128";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import type { Entry, Field } from "@/lib/api/types";
import Image from "next/image";
import React, { useState } from "react";

interface BarcodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: Entry[];
  barcodeField: Field;
}

const DEFAULT_BAR_UNIT = 1.4;
const DEFAULT_BAR_HEIGHT = 28;
const DEFAULT_NUMBER_SIZE = 9;

export default function BarcodeExportModal({
  isOpen,
  onClose,
  entries,
  barcodeField,
}: BarcodeExportModalProps) {
  const { tenant } = useAuth();
  const logoUrl = resolveAssetUrl(tenant?.logo_url ?? null);

  const [barUnit, setBarUnit] = useState(DEFAULT_BAR_UNIT);
  const [barHeight, setBarHeight] = useState(DEFAULT_BAR_HEIGHT);
  const [numberSize, setNumberSize] = useState(DEFAULT_NUMBER_SIZE);

  const codes = entries
    .map((entry) => String(entry.data[barcodeField.key] ?? "").trim())
    .filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl m-4 p-6 max-h-[90vh] overflow-y-auto !rounded-none">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #barcode-print-area, #barcode-print-area * { visibility: visible; }
          #barcode-print-area {
            /* fixed (not absolute) so it anchors to the page itself, not to
               this modal's own centered, size-constrained box */
            position: fixed; top: 0; left: 0;
            width: 190mm; margin: 0; padding: 0;
            background: white;
            display: flex; flex-wrap: wrap; gap: 14px;
          }
          .barcode-label {
            page-break-inside: avoid;
            max-width: 100%;
          }
        }
      `}</style>

      <div className="mb-5 flex items-center justify-between pr-12 sm:pr-14">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Exporter les codes-barres ({codes.length})
        </h4>
        <Button type="button" size="sm" onClick={() => window.print()}>
          Imprimer / Exporter en PDF
        </Button>
      </div>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Ajustez la taille ci-dessous - l&apos;aperçu correspond exactement à ce
        qui sera imprimé.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-4 border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-3">
        <div>
          <Label className="mb-1">Épaisseur des barres ({barUnit.toFixed(1)}px)</Label>
          <input
            type="range"
            min={0.8}
            max={3}
            step={0.1}
            value={barUnit}
            onChange={(e) => setBarUnit(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <Label className="mb-1">Hauteur des barres ({barHeight}px)</Label>
          <input
            type="range"
            min={15}
            max={60}
            step={1}
            value={barHeight}
            onChange={(e) => setBarHeight(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <Label className="mb-1">Taille du numéro ({numberSize}px)</Label>
          <input
            type="range"
            min={5}
            max={18}
            step={1}
            value={numberSize}
            onChange={(e) => setNumberSize(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Always a plain white "label sheet", like the print preview - this
       * is the actual printed output, not app UI, so it shouldn't follow
       * the app's own light/dark theme (the barcode bars are hardcoded
       * black and become invisible against a dark background). */}
      <div id="barcode-print-area" className="flex flex-wrap gap-x-6 gap-y-4 rounded-lg border border-gray-200 bg-white p-4">
        {codes.map((code) => (
          <div key={code} className="barcode-label flex items-end gap-2">
            {logoUrl && (
              <span
                className="relative block shrink-0"
                style={{ height: barHeight, width: barHeight }}
              >
                <Image src={logoUrl} alt="" fill unoptimized className="object-contain" />
              </span>
            )}
            <div className="flex flex-col items-center">
              <span
                className="font-semibold leading-none text-black"
                style={{ fontSize: numberSize }}
              >
                {code}
              </span>
              <Barcode128 value={code} unit={barUnit} height={barHeight} />
            </div>
          </div>
        ))}
        {codes.length === 0 && (
          <p className="p-4 text-sm text-gray-500">
            Aucun code-barres à exporter pour l&apos;instant.
          </p>
        )}
      </div>
    </Modal>
  );
}
