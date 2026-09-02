"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import OrgLogo from "../components/common/OrgLogo";
import {
  ChevronDownIcon,
  HomeIcon,
  HorizontaLDots,
  SettingsIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  {
    icon: <HomeIcon />,
    name: "Home",
    path: "/",
    subItems: [
      { name: "Mes registres", path: "/registers" },
      { name: "Archives", path: "/registers/archives" },
    ],
  },
  {
    icon: <SettingsIcon />,
    name: "Paramètres",
    path: "/parametres",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => path === pathname || pathname.startsWith(`${path}/`),
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
  }, [pathname, isActive]);

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

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          <OrgLogo iconOnly={!showLabels} />
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {showLabels ? "Menu" : <HorizontaLDots />}
              </h2>
              <ul className="flex flex-col gap-4">
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
                      {nav.subItems && showLabels && (
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
                    {nav.subItems && showLabels && (
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
                            <li key={subItem.name}>
                              <Link
                                href={subItem.path}
                                className={`menu-dropdown-item ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-item-active"
                                    : "menu-dropdown-item-inactive"
                                }`}
                              >
                                {subItem.name}
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
    </aside>
  );
};

export default AppSidebar;
