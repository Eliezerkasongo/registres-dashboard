import { code128CModules } from "@/lib/barcode/code128";
import React from "react";

interface Barcode128Props {
  value: string;
  /** Pixel width of one module. Code 128 is dense - keep this small. */
  unit?: number;
  height?: number;
  className?: string;
}

export default function Barcode128({
  value,
  unit = 1,
  height = 26,
  className,
}: Barcode128Props) {
  const modules = code128CModules(value);
  const totalWidth = modules.length * unit;

  const bars: React.ReactNode[] = [];
  let runStart = 0;
  for (let i = 0; i <= modules.length; i++) {
    if (modules[i] !== modules[runStart]) {
      if (modules[runStart] === "1") {
        bars.push(
          <rect key={runStart} x={runStart * unit} y={0} width={(i - runStart) * unit} height={height} fill="black" />
        );
      }
      runStart = i;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      width={totalWidth}
      height={height}
      className={className}
      role="img"
      aria-label={`Code-barres ${value}`}
    >
      {bars}
    </svg>
  );
}
