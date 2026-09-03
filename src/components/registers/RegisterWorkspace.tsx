"use client";
import BarcodeExportModal from "@/components/registers/BarcodeExportModal";
import ColumnHeaderCell, { ColumnFilterOption } from "@/components/registers/ColumnHeaderCell";
import EditRegisterModal from "@/components/registers/EditRegisterModal";
import EntryFormModal from "@/components/registers/EntryFormModal";
import EntryViewModal from "@/components/registers/EntryViewModal";
import FieldFormModal from "@/components/registers/FieldFormModal";
import PasswordConfirmDialog from "@/components/registers/PasswordConfirmDialog";
import PrintPreviewModal from "@/components/registers/PrintPreviewModal";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Pagination from "@/components/tables/Pagination";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api/client";
import { verifyPassword } from "@/lib/api/auth";
import {
  addField,
  archiveRegister,
  createEntry,
  deleteEntry,
  deleteField,
  entryHistory,
  exportRegister,
  fieldOptions,
  getRegister,
  listEntries,
  updateEntry,
  updateField,
  updateRegister,
} from "@/lib/api/registers";
import { resolveAssetUrl } from "@/lib/utils/assetUrl";
import type {
  DeletedEntry,
  Entry,
  Field,
  FieldInput,
  FieldOption,
  RegisterDetail,
} from "@/lib/api/types";
import { FullscreenIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_PER_PAGE = 30;
// Excel-style column sizing: each field column starts out just wide enough
// for its label (roughly 7px/character plus room for the filter icon and
// padding), clamped to a sane range, and the user can drag it wider/
// narrower from there (see ColumnHeaderCell). Columns beyond the visible
// width simply scroll horizontally, same as a spreadsheet.
const MIN_AUTO_COLUMN_WIDTH = 96;
const MAX_AUTO_COLUMN_WIDTH = 320;
const CHECKBOX_COLUMN_WIDTH = 44;
const INDEX_COLUMN_WIDTH = 56;
const ACTIONS_COLUMN_WIDTH = 92;
// When a column filter is active, up to this many entries are fetched (the
// API's own per-request cap) so filtering isn't limited to just the
// currently-displayed page - there's no server-side filtering endpoint, so
// this is the widest net a single request can cast.
const MAX_FILTERABLE_ENTRIES = 200;

function autoColumnWidth(label: string): number {
  return Math.min(MAX_AUTO_COLUMN_WIDTH, Math.max(MIN_AUTO_COLUMN_WIDTH, label.length * 7 + 56));
}

/** Drag handle for reordering fields in the "Champs" tab - a plain 6-dot
 * grip, no shared icon for this exists yet. */
function GripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}
const PER_PAGE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "30", label: "30" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

type Tab = "entries" | "fields" | "history";
type PendingFieldDelete = { id: number };

interface RegisterWorkspaceProps {
  registerId: number;
}

export default function RegisterWorkspace({
  registerId,
}: RegisterWorkspaceProps) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  const [register, setRegister] = useState<RegisterDetail | null>(null);
  const [isLoadingRegister, setIsLoadingRegister] = useState(true);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("entries");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const [history, setHistory] = useState<DeletedEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);

  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  // Holds the form data collected by FieldFormModal for an *edit* (not a
  // create) while the password-confirmation step is pending - the actual
  // updateField() call only happens once that's confirmed.
  const [pendingFieldEdit, setPendingFieldEdit] = useState<FieldInput | null>(null);
  // Drag-and-drop reordering in the "Champs" tab: the dragged field's id
  // while a drag is in progress, and whether the reordered sort_order
  // values are currently being persisted (one updateField() call per field).
  const [draggedFieldId, setDraggedFieldId] = useState<number | null>(null);
  const [isSavingFieldOrder, setIsSavingFieldOrder] = useState(false);

  const [isEditRegisterOpen, setIsEditRegisterOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [pendingEntryDeletes, setPendingEntryDeletes] = useState<Entry[] | null>(null);
  const [pendingFieldDelete, setPendingFieldDelete] = useState<PendingFieldDelete | null>(null);
  const [barcodeExportEntries, setBarcodeExportEntries] = useState<Entry[] | null>(null);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  // A "select" field wired to another register stores the source entry's id
  // as its value (see RegisterFieldController::options()) - this maps each
  // such field's id to its {value: sourceEntryId, label} options so entries
  // can be displayed by the label the user actually picked, not the id.
  const [referenceOptions, setReferenceOptions] = useState<Record<number, FieldOption[]>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  // The checkbox/selection column is opt-in - hidden by default to save
  // width, toggled back on with the small button next to the search bar.
  const [showSelectionColumn, setShowSelectionColumn] = useState(false);

  // Excel-style column widths (px), keyed by field key - starts empty and
  // falls back to autoColumnWidth() per field until the user drags one.
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  // Per-column filter: string[] for a "choice" column (select/boolean -
  // matches ANY of the selected modalités), string for a "text" column
  // (case-insensitive contains). No entry for a key means "not filtered".
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | string>>({});
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  // There's no server-side filtering endpoint, so an active filter fetches
  // up to MAX_FILTERABLE_ENTRIES entries once (independent of the normal
  // paginated `entries`) and filters that batch entirely client-side.
  const [filterableEntries, setFilterableEntries] = useState<Entry[] | null>(null);
  const [isLoadingFilterableEntries, setIsLoadingFilterableEntries] = useState(false);

  const loadRegister = useCallback(async () => {
    setIsLoadingRegister(true);
    setRegisterError(null);
    try {
      const data = await getRegister(registerId);
      setRegister(data);
    } catch (err) {
      setRegisterError(
        err instanceof ApiError ? err.message : "Impossible de charger le registre."
      );
    } finally {
      setIsLoadingRegister(false);
    }
  }, [registerId]);

  const loadEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    setEntriesError(null);
    try {
      const res = await listEntries(registerId, {
        page,
        per_page: perPage,
        search: search || undefined,
      });
      setEntries(res.data);
      setTotal(res.meta.total);
      setSelectedIds(new Set());
    } catch (err) {
      setEntriesError(
        err instanceof ApiError ? err.message : "Impossible de charger les entrées."
      );
    } finally {
      setIsLoadingEntries(false);
    }
  }, [registerId, page, perPage, search]);

  const hasActiveFilters = Object.values(columnFilters).some((v) =>
    Array.isArray(v) ? v.length > 0 : v.trim() !== ""
  );

  // No server-side filtering endpoint exists, so an active column filter
  // fetches its own larger batch (independent of the normal paginated
  // `entries`) and filters that client-side instead.
  useEffect(() => {
    if (!hasActiveFilters) {
      setFilterableEntries(null);
      return;
    }
    let cancelled = false;
    setIsLoadingFilterableEntries(true);
    listEntries(registerId, {
      page: 1,
      per_page: MAX_FILTERABLE_ENTRIES,
      search: search || undefined,
    })
      .then((res) => {
        if (!cancelled) setFilterableEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) setFilterableEntries([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFilterableEntries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasActiveFilters, registerId, search]);

  const displayedEntries = hasActiveFilters
    ? (filterableEntries ?? []).filter((entry) =>
        Object.entries(columnFilters).every(([key, filterVal]) => {
          const raw = entry.data[key];
          if (Array.isArray(filterVal)) {
            if (filterVal.length === 0) return true;
            return filterVal.includes(String(raw ?? ""));
          }
          if (typeof filterVal === "string" && filterVal.trim() !== "") {
            return String(raw ?? "").toLowerCase().includes(filterVal.trim().toLowerCase());
          }
          return true;
        })
      )
    : entries;

  // Column widths persist per register across visits (like Excel remembering
  // a spreadsheet's column widths) - loaded fresh whenever registerId changes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`columnWidths:${registerId}`);
      setColumnWidths(raw ? JSON.parse(raw) : {});
    } catch {
      setColumnWidths({});
    }
  }, [registerId]);

  function setColumnWidth(key: string, width: number) {
    setColumnWidths((prev) => {
      const next = { ...prev, [key]: width };
      try {
        localStorage.setItem(`columnWidths:${registerId}`, JSON.stringify(next));
      } catch {
        // Private browsing / quota exceeded - the width just won't persist.
      }
      return next;
    });
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === displayedEntries.length
        ? new Set()
        : new Set(displayedEntries.map((e) => e.id))
    );
  }

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      setHistory(await entryHistory(registerId));
    } catch {
      toast.error("Erreur", "Impossible de charger l'historique des suppressions.");
    } finally {
      setIsLoadingHistory(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerId]);

  // The [id] page route doesn't remount this component when navigating
  // from one register straight to another (same component instance, just a
  // new registerId prop), so without this a leftover search term or page
  // number from the previous register would silently carry over and filter
  // the next register's entries against it.
  useEffect(() => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    setSelectedIds(new Set());
    setColumnFilters({});
    setOpenFilterKey(null);
  }, [registerId]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  useEffect(() => {
    if (!register) return;
    const referenceFields = register.fields.filter(
      (f) => f.type === "select" && f.source_register_id
    );
    referenceFields.forEach((field) => {
      fieldOptions(registerId, field.id)
        .then((options) => setReferenceOptions((prev) => ({ ...prev, [field.id]: options })))
        .catch(() => undefined);
    });
  }, [register, registerId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function handleEntrySubmit(data: Record<string, unknown>) {
    if (editingEntry) {
      await updateEntry(registerId, editingEntry.id, data);
      toast.success("Entrée modifiée");
    } else {
      await createEntry(registerId, data);
      toast.success("Entrée ajoutée");
    }
    await loadEntries();
  }

  async function handleFieldSubmit(input: FieldInput) {
    if (editingField) {
      // Modifying an existing field needs a password confirmation - stash
      // the form data and let handleConfirmFieldEdit apply it once
      // confirmed. FieldFormModal closes normally here; the password
      // dialog opens right after (pendingFieldEdit !== null).
      setPendingFieldEdit(input);
      return;
    }
    await addField(registerId, input);
    toast.success("Champ ajouté");
    await loadRegister();
  }

  async function handleConfirmFieldEdit(password: string) {
    if (!editingField || !pendingFieldEdit || !user) return;
    await verifyPassword(user.email, password);
    await updateField(registerId, editingField.id, pendingFieldEdit);
    toast.success("Champ modifié");
    setPendingFieldEdit(null);
    setEditingField(null);
    await loadRegister();
  }

  async function handleSetMain() {
    try {
      const updated = await updateRegister(registerId, { is_main: true });
      setRegister(updated);
      toast.success("Registre principal défini", `"${updated.name}" s'affichera désormais sur Home.`);
    } catch (err) {
      toast.error(
        "Action impossible",
        err instanceof ApiError ? err.message : "Impossible de définir ce registre comme principal."
      );
    }
  }

  async function handleArchive(password: string) {
    await archiveRegister(registerId, password);
    toast.success("Registre archivé", "Retrouvez-le dans Home > Archives.");
    router.push("/registers");
  }

  async function handleExport() {
    if (!register) return;
    setIsExporting(true);
    try {
      await exportRegister(registerId, register.slug);
    } catch (err) {
      toast.error(
        "Export impossible",
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteEntries(password: string, reason: string) {
    if (!pendingEntryDeletes || pendingEntryDeletes.length === 0) return;
    for (const entry of pendingEntryDeletes) {
      await deleteEntry(registerId, entry.id, password, reason);
    }
    toast.success(
      pendingEntryDeletes.length > 1
        ? `${pendingEntryDeletes.length} entrées supprimées`
        : "Entrée supprimée"
    );
    setPendingEntryDeletes(null);
    await loadEntries();
  }

  async function handleConfirmFieldDelete(password: string) {
    if (!pendingFieldDelete || !user) return;
    await verifyPassword(user.email, password);
    await deleteField(registerId, pendingFieldDelete.id);
    toast.success("Champ supprimé");
    setPendingFieldDelete(null);
    await loadRegister();
  }

  /** Dragging a field row over another one live-reorders `register.fields`
   * so the table visually reflects the drop position as you drag - the
   * actual save only happens once on drop (handleFieldDrop). */
  function handleFieldDragOver(e: React.DragEvent<HTMLTableRowElement>, overFieldId: number) {
    e.preventDefault();
    if (!register || draggedFieldId === null || draggedFieldId === overFieldId) return;

    const current = [...register.fields].sort((a, b) => a.sort_order - b.sort_order);
    const fromIndex = current.findIndex((f) => f.id === draggedFieldId);
    const toIndex = current.findIndex((f) => f.id === overFieldId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...current];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setRegister({ ...register, fields: reordered.map((f, index) => ({ ...f, sort_order: index })) });
  }

  /** Persists the order currently shown in the table - there's no bulk
   * reorder endpoint, so every field gets its own updateField() call with
   * its new position. On failure, reverts to the server's own order. */
  async function handleFieldDrop() {
    const wasDragging = draggedFieldId !== null;
    setDraggedFieldId(null);
    if (!register || !wasDragging) return;

    setIsSavingFieldOrder(true);
    try {
      await Promise.all(
        register.fields.map((field, index) => updateField(registerId, field.id, { sort_order: index }))
      );
    } catch (err) {
      toast.error(
        "Action impossible",
        err instanceof ApiError ? err.message : "Impossible d'enregistrer le nouvel ordre des champs."
      );
      await loadRegister();
    } finally {
      setIsSavingFieldOrder(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const selectedEntries = entries.filter((e) => selectedIds.has(e.id));
  const sortedFields = register
    ? [...register.fields].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const barcodeField = sortedFields.find((f) => f.type === "barcode") ?? null;
  // Compact, Excel-like padding - just enough margin around the content.
  const entriesHeaderPadding = "px-2 py-1";
  const entriesBodyPadding = "px-2 py-1";
  // Fullscreen must fit every column with no horizontal scroll - shrinking
  // the text a bit further (on top of compressing the columns themselves)
  // buys extra room for that.
  const entriesTextSize = isFullscreen ? "text-[10px]" : "text-theme-xs";

  /** The filter checklist for a "choice" field: a reference-select's
   * resolved {value, label} options if it's wired to another register,
   * this field's own static options otherwise, or a plain Oui/Non pair for
   * a boolean field. */
  function modalitesFor(field: Field): ColumnFilterOption[] {
    if (field.type === "boolean") {
      return [
        { value: "true", label: "Oui" },
        { value: "false", label: "Non" },
      ];
    }
    if (field.type === "select" && field.source_register_id) {
      return referenceOptions[field.id] ?? [];
    }
    return (field.options ?? []).map((o) => ({ value: o, label: o }));
  }

  /** A "select" field wired to another register stores the source entry's
   * id as its raw value - this resolves it back to the label the user
   * actually picked (referenceOptions[field.id]), falling back to the raw
   * value (e.g. the id, if the referenced entry was since deleted). */
  function resolveDisplayValue(field: Field, raw: unknown): string {
    if (field.type === "select" && field.source_register_id && raw !== null && raw !== undefined && raw !== "") {
      const match = referenceOptions[field.id]?.find((o) => o.value === String(raw));
      if (match) return match.label;
    }
    if (field.type === "number" && raw !== null && raw !== undefined && raw !== "") {
      const num = Number(raw);
      // Excel imports and computed values can carry long floating-point
      // tails (e.g. 1045.6200000000001) - round to 2 decimals for display,
      // without padding whole numbers with trailing zeros.
      if (Number.isFinite(num)) return String(Math.round(num * 100) / 100);
    }
    return String(raw ?? "");
  }

  function renderEntryValue(field: Field, entry: Entry) {
    const raw = entry.data[field.key];

    if (field.type === "boolean") {
      return (
        <Badge size="sm" color={raw ? "success" : "light"}>
          {raw ? "Oui" : "Non"}
        </Badge>
      );
    }

    if (field.type === "file" && raw) {
      const url = resolveAssetUrl(String(raw));
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 underline hover:text-brand-600"
        >
          Voir le fichier
        </a>
      ) : null;
    }

    return resolveDisplayValue(field, raw);
  }

  /** Table cells cut long text at a fixed character count (independent of
   * the column's own width) so a handful of very long values can't blow up
   * every row's height - the full value is still one click away (row
   * popup) or a hover away (native title tooltip on the cell). */
  const CELL_TRUNCATE_AT = 17;
  function truncateCellText(value: string): string {
    return value.length > CELL_TRUNCATE_AT ? `${value.slice(0, 18)}...` : value;
  }

  /** Table-only wrapper around renderEntryValue() - EntryViewModal's popup
   * uses renderEntryValue() directly so it always shows the full value. */
  function renderTruncatedEntryValue(field: Field, entry: Entry) {
    const value = renderEntryValue(field, entry);
    return typeof value === "string" ? truncateCellText(value) : value;
  }

  if (isLoadingRegister) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
    );
  }

  if (registerError || !register) {
    return (
      <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
        {registerError || "Registre introuvable."}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] overflow-y-auto bg-white dark:bg-gray-900"
          : undefined
      }
    >
      <div
        className={
          isFullscreen
            ? "sticky top-0 z-10 bg-white px-4 pt-4 dark:bg-gray-900"
            : undefined
        }
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {register.name}
            </h2>
            {register.is_main && <Badge color="success">Principal</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={isExporting} onClick={handleExport}>
              {isExporting ? "Export en cours..." : "Exporter"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setIsPrintPreviewOpen(true)}>
              Imprimer
            </Button>
            {barcodeField && (
              <Button type="button" size="sm" variant="outline" onClick={() => setBarcodeExportEntries(entries)}>
                Codes-barres
              </Button>
            )}
            {!register.is_main && (
              <Button type="button" size="sm" variant="outline" onClick={handleSetMain}>
                Définir principal
              </Button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen((v) => !v)}
                className="dropdown-toggle flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                aria-label="Plus d'actions"
              >
                •••
              </button>
              <Dropdown isOpen={isActionsMenuOpen} onClose={() => setIsActionsMenuOpen(false)} className="w-56 p-1">
                <DropdownItem
                  onItemClick={() => setIsActionsMenuOpen(false)}
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2"
                >
                  <FullscreenIcon className="h-4 w-4" />
                  {isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                </DropdownItem>
                <DropdownItem onItemClick={() => setIsActionsMenuOpen(false)} onClick={() => setIsEditRegisterOpen(true)}>
                  Modifier le registre
                </DropdownItem>
                <DropdownItem
                  onItemClick={() => setIsActionsMenuOpen(false)}
                  onClick={() => setIsArchiveOpen(true)}
                  className="!text-error-500"
                >
                  Archiver le registre
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </div>

        {register.description && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {register.description}
          </p>
        )}

        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab("entries")}
            className={`px-2 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "entries"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Entrées
          </button>
          <button
            onClick={() => setActiveTab("fields")}
            className={`px-2 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "fields"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Champs
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-2 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "history"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Historique
          </button>
        </div>
      </div>

      <div className={isFullscreen ? "px-4 pb-4" : undefined}>

      {activeTab === "entries" && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
                <Input
                  // Input is uncontrolled (defaultValue only sets the
                  // initial text) - remounting it on registerId change is
                  // what actually clears the visible box, in sync with the
                  // searchInput/search state reset above.
                  key={registerId}
                  placeholder="Rechercher..."
                  defaultValue={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </form>
              <div className="w-36">
                <Select
                  options={PER_PAGE_OPTIONS}
                  defaultValue={String(perPage)}
                  onChange={(value) => {
                    setPerPage(Number(value));
                    setPage(1);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSelectionColumn((v) => !v);
                  setSelectedIds(new Set());
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm ${
                  showSelectionColumn
                    ? "border-brand-500 bg-brand-50 text-brand-500 dark:bg-brand-500/10"
                    : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                }`}
                aria-label={
                  showSelectionColumn
                    ? "Masquer la colonne de sélection"
                    : "Afficher la colonne de sélection"
                }
                title={
                  showSelectionColumn
                    ? "Masquer la sélection"
                    : "Afficher la sélection"
                }
              >
                ☑
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              startIcon={<PlusIcon />}
              onClick={() => {
                setEditingEntry(null);
                setIsEntryModalOpen(true);
              }}
            >
              Nouvelle entrée
            </Button>
          </div>

          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-500/10">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}
              </span>
              {barcodeField && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setBarcodeExportEntries(selectedEntries)}
                >
                  Exporter les codes-barres
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="!text-error-500 !ring-error-300 hover:!bg-error-50"
                onClick={() => setPendingEntryDeletes(selectedEntries)}
              >
                Supprimer la sélection
              </Button>
            </div>
          )}

          {entriesError && (
            <div className="mb-4 rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
              {entriesError}
            </div>
          )}

          {hasActiveFilters && (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {isLoadingFilterableEntries
                ? "Chargement des données à filtrer..."
                : `${displayedEntries.length} résultat(s) filtré(s) sur ${filterableEntries?.length ?? 0} chargé(s).`}
            </p>
          )}

          {isLoadingEntries ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chargement...
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <Table className={isFullscreen ? "table-fixed w-full" : "table-fixed"}>
                  <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <TableRow>
                      {showSelectionColumn && (
                        <TableCell
                          isHeader
                          style={{ width: CHECKBOX_COLUMN_WIDTH }}
                          className={`${entriesHeaderPadding} font-medium text-gray-500 text-start ${entriesTextSize} whitespace-nowrap border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                        >
                          <input
                            type="checkbox"
                            checked={displayedEntries.length > 0 && selectedIds.size === displayedEntries.length}
                            onChange={toggleSelectAll}
                            aria-label="Tout sélectionner"
                          />
                        </TableCell>
                      )}
                      <TableCell
                        isHeader
                        style={{ width: INDEX_COLUMN_WIDTH }}
                        className={`${entriesHeaderPadding} font-medium text-gray-500 text-start ${entriesTextSize} whitespace-nowrap border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                      >
                        #
                      </TableCell>
                      {sortedFields.map((field) => (
                        <TableCell
                          key={field.id}
                          isHeader
                          style={isFullscreen ? undefined : { width: columnWidths[field.key] ?? autoColumnWidth(field.label) }}
                          className={`${entriesHeaderPadding} font-medium text-gray-500 text-start ${entriesTextSize} whitespace-nowrap border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                        >
                          <ColumnHeaderCell
                            label={field.label}
                            width={columnWidths[field.key] ?? autoColumnWidth(field.label)}
                            onResize={(w) => setColumnWidth(field.key, w)}
                            filterKind={field.type === "select" || field.type === "boolean" ? "choice" : "text"}
                            modalites={modalitesFor(field)}
                            filterValue={columnFilters[field.key] ?? (field.type === "select" || field.type === "boolean" ? [] : "")}
                            onFilterChange={(value) =>
                              setColumnFilters((prev) => ({ ...prev, [field.key]: value }))
                            }
                            isOpen={openFilterKey === field.key}
                            onOpenChange={(open) => setOpenFilterKey(open ? field.key : null)}
                          />
                        </TableCell>
                      ))}
                      <TableCell
                        isHeader
                        style={{ width: ACTIONS_COLUMN_WIDTH }}
                        className={`${entriesHeaderPadding} sticky right-0 border-l border-gray-100 bg-gray-50 font-medium text-gray-500 text-start ${entriesTextSize} dark:border-white/[0.05] dark:bg-gray-900 dark:text-gray-400`}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {displayedEntries.map((entry, index) => (
                      <TableRow key={entry.id}>
                        {showSelectionColumn && (
                          <TableCell className={`${entriesBodyPadding} text-start border-r border-gray-100 dark:border-white/[0.05]`}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(entry.id)}
                              onChange={() => toggleSelected(entry.id)}
                              aria-label="Sélectionner cette entrée"
                            />
                          </TableCell>
                        )}
                        <TableCell
                          className={`${entriesBodyPadding} text-gray-500 text-start ${entriesTextSize} cursor-pointer border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                          onClick={() => setViewingEntry(entry)}
                        >
                          {hasActiveFilters ? index + 1 : (page - 1) * perPage + index + 1}
                        </TableCell>
                        {sortedFields.map((field) => (
                          <TableCell
                            key={field.id}
                            className={`${entriesBodyPadding} text-gray-600 text-start ${entriesTextSize} cursor-pointer border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-300`}
                            onClick={() => setViewingEntry(entry)}
                          >
                            <div
                              className="truncate"
                              title={resolveDisplayValue(field, entry.data[field.key])}
                            >
                              {renderTruncatedEntryValue(field, entry)}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell
                          className={`${entriesBodyPadding} sticky right-0 border-l border-gray-100 bg-white text-start dark:border-white/[0.05] dark:bg-gray-900`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setEditingEntry(entry);
                                setIsEntryModalOpen(true);
                              }}
                              className="text-gray-400 hover:text-brand-500"
                              aria-label="Modifier l'entrée"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              onClick={() => setPendingEntryDeletes([entry])}
                              className="text-gray-400 hover:text-error-500"
                              aria-label="Supprimer l'entrée"
                            >
                              <TrashBinIcon />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {displayedEntries.length === 0 && (
                      <TableRow>
                        <TableCell
                          className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                          colSpan={sortedFields.length + (showSelectionColumn ? 3 : 2)}
                        >
                          {hasActiveFilters
                            ? "Aucune entrée ne correspond à ces filtres."
                            : "Aucune entrée pour l'instant."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {!hasActiveFilters && totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "fields" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isSavingFieldOrder
                ? "Enregistrement de l'ordre..."
                : "Glissez une ligne par sa poignée pour réordonner les champs."}
            </p>
            <Button
              type="button"
              size="sm"
              startIcon={<PlusIcon />}
              onClick={() => {
                setEditingField(null);
                setIsFieldModalOpen(true);
              }}
            >
              Ajouter un champ
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03]">
                  <TableRow>
                    <TableCell isHeader className="w-8 px-2 py-3"></TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Clé</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Libellé</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Obligatoire</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {sortedFields.map((field, index) => (
                    <TableRow
                      key={field.id}
                      className={draggedFieldId === field.id ? "opacity-40" : ""}
                      onDragOver={(e) => handleFieldDragOver(e, field.id)}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFieldDrop();
                      }}
                      onDragEnd={handleFieldDrop}
                    >
                      <TableCell className="w-8 px-2 py-4 text-start">
                        <span
                          draggable
                          onDragStart={() => setDraggedFieldId(field.id)}
                          className="inline-flex cursor-grab items-center text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
                          aria-label="Réordonner le champ"
                          title="Glisser pour réordonner"
                        >
                          <GripIcon className="h-4 w-4" />
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{index + 1}</TableCell>
                      <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">{field.key}</TableCell>
                      <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">{field.label}</TableCell>
                      <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                        {field.type}
                        {field.source_register_id && " (référence)"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                        {field.required ? (
                          <Badge size="sm" color="success">Oui</Badge>
                        ) : (
                          <Badge size="sm" color="light">Non</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingField(field);
                              setIsFieldModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-brand-500"
                            aria-label="Modifier le champ"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            onClick={() => setPendingFieldDelete({ id: field.id })}
                            className="text-gray-400 hover:text-error-500"
                            aria-label="Supprimer le champ"
                          >
                            <TrashBinIcon />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedFields.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                        colSpan={7}
                      >
                        Aucun champ pour l&apos;instant.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Contenu</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Raison</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supprimé le</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                      Aucune suppression pour l&apos;instant.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">{index + 1}</TableCell>
                      <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                        {sortedFields
                          .map((f) => resolveDisplayValue(f, entry.data[f.key]))
                          .filter(Boolean)
                          .join(" · ")}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                        {entry.deletion_reason}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-gray-600 text-start text-theme-sm dark:text-gray-300">
                        {entry.deleted_at ? new Date(entry.deleted_at).toLocaleString("fr-FR") : ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      </div>

      <EntryFormModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        registerId={registerId}
        fields={register.fields}
        entry={editingEntry}
        onSubmit={handleEntrySubmit}
      />

      <EntryViewModal
        isOpen={viewingEntry !== null}
        onClose={() => setViewingEntry(null)}
        entry={viewingEntry}
        fields={sortedFields}
        renderValue={renderEntryValue}
      />

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        registerName={register.name}
        fields={sortedFields}
        entries={displayedEntries}
        resolveText={resolveDisplayValue}
      />

      <FieldFormModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        field={editingField}
        currentRegisterId={registerId}
        onSubmit={handleFieldSubmit}
      />

      <EditRegisterModal
        isOpen={isEditRegisterOpen}
        onClose={() => setIsEditRegisterOpen(false)}
        register={register}
        onUpdated={(updated) => setRegister(updated)}
      />

      {barcodeField && barcodeExportEntries !== null && (
        <BarcodeExportModal
          isOpen={barcodeExportEntries !== null}
          onClose={() => setBarcodeExportEntries(null)}
          entries={barcodeExportEntries}
          barcodeField={barcodeField}
        />
      )}

      <PasswordConfirmDialog
        isOpen={isArchiveOpen}
        title="Archiver ce registre ?"
        description="Le registre sera déplacé dans Home > Archives. Vous pourrez le restaurer plus tard."
        confirmLabel="Archiver"
        onConfirm={(password) => handleArchive(password)}
        onClose={() => setIsArchiveOpen(false)}
      />

      <PasswordConfirmDialog
        isOpen={pendingEntryDeletes !== null}
        title={
          pendingEntryDeletes && pendingEntryDeletes.length > 1
            ? `Supprimer ces ${pendingEntryDeletes.length} entrées ?`
            : "Supprimer cette entrée ?"
        }
        description="Elles resteront consultables dans l'historique des suppressions."
        requireReason
        confirmLabel="Supprimer"
        onConfirm={handleDeleteEntries}
        onClose={() => setPendingEntryDeletes(null)}
      />

      <PasswordConfirmDialog
        isOpen={pendingFieldDelete !== null}
        title="Supprimer ce champ ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleConfirmFieldDelete}
        onClose={() => setPendingFieldDelete(null)}
      />

      <PasswordConfirmDialog
        isOpen={pendingFieldEdit !== null}
        title="Confirmer la modification du champ"
        description="Confirmez avec votre mot de passe pour appliquer ces changements."
        confirmLabel="Confirmer"
        onConfirm={handleConfirmFieldEdit}
        onClose={() => {
          setPendingFieldEdit(null);
          setEditingField(null);
        }}
      />
    </div>
  );
}
