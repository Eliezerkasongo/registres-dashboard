"use client";
import { useAuth } from "@/context/AuthContext";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import Image from "next/image";

interface OrgLogoProps {
  /** Icon-only rendering for the collapsed sidebar state. */
  iconOnly?: boolean;
}

const SIZE = 36;
const ICON_SIZE = 32;

export default function OrgLogo({ iconOnly = false }: OrgLogoProps) {
  const { tenant } = useAuth();
  const logoUrl = resolveAssetUrl(tenant?.logo_url ?? null);
  const size = iconOnly ? ICON_SIZE : SIZE;

  // A fixed-size `relative` box + `fill` is used instead of plain width/height
  // props so the logo always renders at this exact size, regardless of its
  // own intrinsic aspect ratio (Tailwind's preflight sets img height:auto,
  // which would otherwise override a plain height prop).
  const mark = logoUrl ? (
    <span
      className="relative block shrink-0 overflow-hidden rounded-md"
      style={{ width: size, height: size }}
    >
      <Image
        src={logoUrl}
        alt={tenant?.name ?? "Logo"}
        fill
        unoptimized
        className="object-contain"
      />
    </span>
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white"
      style={{ width: size, height: size }}
    >
      SL
    </span>
  );

  if (iconOnly) {
    return mark;
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      {mark}
      <span className="truncate text-base font-semibold text-gray-800 dark:text-white/90">
        {tenant?.name ?? "Support Logistique"}
      </span>
    </span>
  );
}
