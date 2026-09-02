"use client";
import BarcodeExportModal from "@/components/registers/BarcodeExportModal";
import EditRegisterModal from "@/components/registers/EditRegisterModal";
import EntryFormModal from "@/components/registers/EntryFormModal";
import EntryViewModal from "@/components/registers/EntryViewModal";
import FieldFormModal from "@/components/registers/FieldFormModal";
import PasswordConfirmDialog from "@/components/registers/PasswordConfirmDialog";
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
// Every field still gets its own column - a register with many fields just
// scrolls horizontally instead of shrinking each column unreadably. Each
// field column is FIELD_COLUMN_WIDTH wide, and the scroll viewport is capped
// (once there are more fields than this) to show MAX_VISIBLE_FIELD_COLUMNS of
// them before a horizontal scrollbar appears; a row's popup (click to open)
// still shows every field at once regardless of scroll position.
const MAX_VISIBLE_FIELD_COLUMNS = 5;
const FIELD_COLUMN_WIDTH = 200;
// Rough width of the checkbox + "#" + Actions columns, used to size the
// scroll viewport so exactly MAX_VISIBLE_FIELD_COLUMNS field columns show.
const FIXED_COLUMNS_WIDTH = 220;
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
      prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.id))
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

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const selectedEntries = entries.filter((e) => selectedIds.has(e.id));
  const sortedFields = register
    ? [...register.fields].sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const barcodeField = sortedFields.find((f) => f.type === "barcode") ?? null;
  // Only cap the scroll viewport's width once there are more fields than fit
  // by default - a register with few fields shouldn't get padded with blank
  // space up to that width. In fullscreen mode, skip the cap entirely: show
  // every column at once (compressed if needed - see FIELD_COLUMN_WIDTH
  // below) rather than requiring a horizontal scroll.
  const entriesTableMaxWidth =
    !isFullscreen && sortedFields.length > MAX_VISIBLE_FIELD_COLUMNS
      ? FIXED_COLUMNS_WIDTH + MAX_VISIBLE_FIELD_COLUMNS * FIELD_COLUMN_WIDTH
      : undefined;
  // More compact rows in fullscreen, where every column is already showing
  // (no scroll) and vertical room matters more than usual.
  const entriesHeaderPadding = isFullscreen ? "px-4 py-2" : "px-5 py-3";
  const entriesBodyPadding = isFullscreen ? "px-4 py-2" : "px-5 py-4";

  /** A "select" field wired to another register stores the source entry's
   * id as its raw value - this resolves it back to the label the user
   * actually picked (referenceOptions[field.id]), falling back to the raw
   * value (e.g. the id, if the referenced entry was since deleted). */
  function resolveDisplayValue(field: Field, raw: unknown): string {
    if (field.type === "select" && field.source_register_id && raw !== null && raw !== undefined && raw !== "") {
      const match = referenceOptions[field.id]?.find((o) => o.value === String(raw));
      if (match) return match.label;
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {register.name}
            </h2>
            {register.is_main && <Badge color="success">Principal</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={isExporting} onClick={handleExport}>
              {isExporting ? "Export en cours..." : "Exporter"}
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
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "entries"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Entrées
          </button>
          <button
            onClick={() => setActiveTab("fields")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "fields"
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Champs
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3">
            <div className="flex flex-wrap items-center gap-3">
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

          {sortedFields.length > MAX_VISIBLE_FIELD_COLUMNS && (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {sortedFields.length} champs au total - faites défiler le tableau horizontalement
              ou cliquez sur une ligne pour tout voir d&apos;un coup.
            </p>
          )}

          {isLoadingEntries ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chargement...
            </p>
          ) : (
            <div
              className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
              style={entriesTableMaxWidth ? { maxWidth: entriesTableMaxWidth } : undefined}
            >
              <div className="max-w-full overflow-x-auto">
                <Table className={isFullscreen ? "table-fixed w-full" : undefined}>
                  <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className={`${entriesHeaderPadding} font-medium text-gray-500 text-start text-theme-xs whitespace-nowrap border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                      >
                        <input
                          type="checkbox"
                          checked={entries.length > 0 && selectedIds.size === entries.length}
                          onChange={toggleSelectAll}
                          aria-label="Tout sélectionner"
                        />
                      </TableCell>
                      <TableCell
                        isHeader
                        className={`${entriesHeaderPadding} font-medium text-gray-500 text-start text-theme-xs whitespace-nowrap border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                      >
                        #
                      </TableCell>
                      {sortedFields.map((field) => (
                        <TableCell
                          key={field.id}
                          isHeader
                          className={`${entriesHeaderPadding} font-medium text-gray-500 text-start text-theme-xs whitespace-nowrap border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                        >
                          <div
                            className={isFullscreen ? "w-full truncate" : "truncate"}
                            style={isFullscreen ? undefined : { width: FIELD_COLUMN_WIDTH }}
                            title={field.label}
                          >
                            {field.label}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell
                        isHeader
                        className={`${entriesHeaderPadding} font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400`}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {entries.map((entry, index) => (
                      <TableRow key={entry.id}>
                        <TableCell className={`${entriesBodyPadding} text-start border-r border-gray-100 dark:border-white/[0.05]`}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelected(entry.id)}
                            aria-label="Sélectionner cette entrée"
                          />
                        </TableCell>
                        <TableCell
                          className={`${entriesBodyPadding} text-gray-500 text-start text-theme-sm cursor-pointer border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-400`}
                          onClick={() => setViewingEntry(entry)}
                        >
                          {(page - 1) * perPage + index + 1}
                        </TableCell>
                        {sortedFields.map((field) => (
                          <TableCell
                            key={field.id}
                            className={`${entriesBodyPadding} text-gray-600 text-start text-theme-sm cursor-pointer border-r border-gray-100 dark:border-white/[0.05] dark:text-gray-300`}
                            onClick={() => setViewingEntry(entry)}
                          >
                            <div
                              className={isFullscreen ? "w-full truncate" : "truncate"}
                              style={isFullscreen ? undefined : { width: FIELD_COLUMN_WIDTH }}
                              title={resolveDisplayValue(field, entry.data[field.key])}
                            >
                              {renderEntryValue(field, entry)}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className={`${entriesBodyPadding} text-start`}>
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
                    {entries.length === 0 && (
                      <TableRow>
                        <TableCell
                          className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                          colSpan={sortedFields.length + 3}
                        >
                          Aucune entrée pour l&apos;instant.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
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
          <div className="flex justify-end mb-4">
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
                    <TableRow key={field.id}>
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
                        colSpan={6}
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
