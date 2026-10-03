"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import OrgLogo from "../components/common/OrgLogo";
import { listRegisters } from "@/lib/api/registers";
import type { RegisterSummary } from "@/lib/api/types";
import {
  BoxIcon,
  ChevronDownIcon,
  HomeIcon,
  HorizontaLDots,
  ListIcon,
  PlusIcon,
  SettingsIcon,
  TrashBinIcon,
} from "../icons/index";

type SubNavItem = {
  name: string;
  path: string;
  title?: string;
  /** A register's own icon, or its name's first letter as a fallback - same
   * rule as the register grid's own cards (RegisterCard.tsx). Left unset for
   * the pinned "Tous les registres" entry, which gets a generic icon instead. */
  badge?: string;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubNavItem[];
};

// Past this length a register's full name would wrap/crowd the sidebar
// submenu, so only its first word is shown there (the full name is still
// on the link as a title tooltip).
const LONG_NAME_THRESHOLD = 16;

// Past this many registers, the submenu caps the list and adds a "Plus de
// registres" link to the full grid page instead of growing forever.
const MAX_VISIBLE_REGISTERS = 5;

function shortenRegisterName(name: string): string {
  return name.length > LONG_NAME_THRESHOLD ? name.split(" ")[0] : name;
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, openCreateRegisterModal } =
    useSidebar();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const pathname = usePathname();

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [registers, setRegisters] = useState<RegisterSummary[]>([]);

  // Refetched on every route change (not just on mount) so a register
  // created/renamed elsewhere shows up here without a full page reload.
  useEffect(() => {
    let cancelled = false;
    listRegisters()
      .then((rows) => {
        if (!cancelled) setRegisters(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const navItems: NavItem[] = useMemo(
    () => [
      {
        icon: <HomeIcon />,
        name: "Home",
        path: "/",
        subItems: [
          ...registers.slice(0, MAX_VISIBLE_REGISTERS).map((register) => ({
            name: shortenRegisterName(register.name),
            title: register.name,
            path: `/registers/${register.id}`,
            badge: register.icon || register.name.charAt(0).toUpperCase(),
          })),
          ...(registers.length > MAX_VISIBLE_REGISTERS
            ? [{ name: "Plus de registres", path: "/registers" }]
            : []),
        ],
      },
      {
        icon: <SettingsIcon />,
        name: "Paramètres",
        // Distinct from "Mon profil" (user menu, ?tab=profile) - an admin
        // lands on the org-level tab, a member (no org tabs) on Mot de passe,
        // so the two entry points no longer open the exact same tab.
        path: isAdmin ? "/parametres?tab=organization" : "/parametres?tab=password",
      },
    ],
    [registers, isAdmin]
  );

  // Compares only the path portion - nav.path can carry a ?tab= query
  // (see "Paramètres" above) that usePathname() never includes.
  const isActive = useCallback(
    (path: string) => {
      const base = path.split("?")[0];
      return base === pathname || pathname.startsWith(`${base}/`);
    },
    [pathname]
  );

  useEffect(() => {
    let matched: number | null = null;
    navItems.forEach((nav, index) => {
      nav.subItems?.forEach((subItem) => {
        if (isActive(subItem.path)) {
          matched = index;
        }
      });
    });
    setOpenSubmenu(matched);
  }, [pathname, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `main-${openSubmenu}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  function handleSubmenuToggle(index: number) {
    setOpenSubmenu((prev) => (prev === index ? null : index));
  }

  const showLabels = isExpanded || isHovered || isMobileOpen;

  // The Next.js dev-mode build indicator ("N" button) is fixed to the exact
  // same bottom-left corner as this block and can't be moved or disabled from
  // here - in dev, extra bottom padding clears it; in production it never
  // renders at all, so these links simply take over that spot.
  const isDev = process.env.NODE_ENV === "development";

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-3 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[230px]"
            : isHovered
            ? "w-[230px]"
            : "w-[72px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-4 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          <OrgLogo iconOnly={!showLabels} />
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-4">
          <div className="flex flex-col gap-2">
            <div>
              <h2
                className={`mb-2 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {showLabels ? "Menu" : <HorizontaLDots />}
              </h2>
              <ul className="flex flex-col gap-2">
                {navItems.map((nav, index) => (
                  <li key={nav.name}>
                    <div
                      className={`menu-item group flex items-center ${
                        (nav.path && isActive(nav.path)) ||
                        openSubmenu === index
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      } ${
                        !isExpanded && !isHovered
                          ? "lg:justify-center"
                          : "lg:justify-start"
                      }`}
                    >
                      <Link
                        href={nav.path ?? "#"}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <span
                          className={
                            (nav.path && isActive(nav.path)) ||
                            openSubmenu === index
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }
                        >
                          {nav.icon}
                        </span>
                        {showLabels && (
                          <span className="menu-item-text">{nav.name}</span>
                        )}
                      </Link>
                      {nav.subItems && nav.subItems.length > 0 && showLabels && (
                        <button
                          type="button"
                          onClick={() => handleSubmenuToggle(index)}
                          aria-label={`Afficher le sous-menu ${nav.name}`}
                          className="p-1.5 shrink-0"
                        >
                          <ChevronDownIcon
                            className={`w-5 h-5 transition-transform duration-200 ${
                              openSubmenu === index
                                ? "rotate-180 text-brand-500"
                                : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    {nav.subItems && nav.subItems.length > 0 && showLabels && (
                      <div
                        ref={(el) => {
                          subMenuRefs.current[`main-${index}`] = el;
                        }}
                        className="overflow-hidden transition-all duration-300"
                        style={{
                          height:
                            openSubmenu === index
                              ? `${subMenuHeight[`main-${index}`]}px`
                              : "0px",
                        }}
                      >
                        <ul className="mt-2 space-y-1 ml-9">
                          {nav.subItems.map((subItem) => (
                            <li key={subItem.path}>
                              <Link
                                href={subItem.path}
                                title={subItem.title}
                                className={`menu-dropdown-item flex items-center gap-2 truncate ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-semibold uppercase text-gray-600 dark:bg-white/10 dark:text-gray-300">
                                  {subItem.badge ?? <ListIcon className="h-3 w-3" />}
                                </span>
                                <span className="truncate">{subItem.name}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>

      {/* Quick access to Archives (restaurable) and Corbeille (définitif) -
       * pinned to the bottom of the sidebar via mt-auto, clear of the nav
       * list above regardless of how many items it has. */}
      <div className={`mt-auto flex flex-col gap-1 pt-2 ${isDev ? "pb-14" : "pb-4"}`}>
        <button
          type="button"
          onClick={openCreateRegisterModal}
          title="Nouveau registre"
          className={`menu-item group flex items-center gap-3 menu-item-inactive ${
            !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
          }`}
        >
          <span className="menu-item-icon-inactive">
            <PlusIcon />
          </span>
          {showLabels && <span className="menu-item-text">Nouveau registre</span>}
        </button>
        <Link
          href="/registers/archives"
          title="Archives (restaurable)"
          className={`menu-item group flex items-center gap-3 ${
            isActive("/registers/archives") ? "menu-item-active" : "menu-item-inactive"
          } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
        >
          <span
            className={
              isActive("/registers/archives") ? "menu-item-icon-active" : "menu-item-icon-inactive"
            }
          >
            <BoxIcon />
          </span>
          {showLabels && <span className="menu-item-text">Archives</span>}
        </Link>
        <Link
          href="/registers/corbeille"
          title="Corbeille (suppression définitive)"
          className={`menu-item group flex items-center gap-3 ${
            isActive("/registers/corbeille") ? "menu-item-active" : "menu-item-inactive"
          } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
        >
          <span
            className={
              isActive("/registers/corbeille") ? "menu-item-icon-active" : "menu-item-icon-inactive"
            }
          >
            <TrashBinIcon />
          </span>
          {showLabels && <span className="menu-item-text">Corbeille</span>}
        </Link>
      </div>
    </aside>
  );
};

export default AppSidebar;
