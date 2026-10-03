"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import PasswordConfirmDialog from "@/components/registers/PasswordConfirmDialog";
import { useToast } from "@/context/ToastContext";
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  updateApiToken,
} from "@/lib/api/apiTokens";
import { ApiError } from "@/lib/api/client";
import { getRegister, listRegisters } from "@/lib/api/registers";
import { listTeam } from "@/lib/api/team";
import type {
  ApiTokenCreated,
  ApiTokenRegisterGrant,
  ApiTokenScope,
  ApiTokenSummary,
  Field,
  RegisterSummary,
  TeamMember,
} from "@/lib/api/types";
import { CopyIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import React, { useEffect, useState } from "react";

const SCOPE_LABELS: Record<ApiTokenScope, string> = {
  "registers:read": "Lecture des registres",
  "registers:write": "Écriture des registres",
};

export default function ApiTokensSettings() {
  const toast = useToast();
  const [tokens, setTokens] = useState<ApiTokenSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiTokenSummary | null>(null);
  const [created, setCreated] = useState<ApiTokenCreated | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ApiTokenSummary | null>(null);

  function reload() {
    setIsLoading(true);
    listApiTokens()
      .then(setTokens)
      .catch(() => toast.error("Erreur", "Impossible de charger les tokens API."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEdit(token: ApiTokenSummary) {
    setEditing(token);
    setIsFormOpen(true);
  }

  function handleCreated(token: ApiTokenCreated) {
    setCreated(token);
    setIsFormOpen(false);
    reload();
  }

  function handleUpdated() {
    setIsFormOpen(false);
    setEditing(null);
    reload();
  }

  async function handleRevoke(password: string) {
    if (!pendingRevoke) return;
    await revokeApiToken(pendingRevoke.id, password);
    toast.success("Token révoqué", `« ${pendingRevoke.name} » n'a plus accès à l'API.`);
    setPendingRevoke(null);
    reload();
  }

  return (
    <ComponentCard
      title="Tokens API"
      desc="Accès machine-à-machine (ex. un pont MCP) : jetons longue durée, restreints aux registres, colonnes et permissions choisies, révocables ou modifiables à tout moment."
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            Créer un token
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucun token API pour l&apos;instant.
          </p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white/90">{token.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                    {token.token_prefix}...
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {token.scopes.map((scope) => (
                      <Badge key={scope} size="sm" color="light">
                        {SCOPE_LABELS[scope] ?? scope}
                      </Badge>
                    ))}
                    <Badge size="sm" color={token.registers.length > 0 ? "warning" : "primary"}>
                      {token.registers.length > 0
                        ? `${token.registers.length} registre(s) restreint(s)`
                        : "Tous les registres"}
                    </Badge>
                    {token.assigned_user && (
                      <Badge size="sm" color="info">
                        {token.assigned_user.name}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Créé le {new Date(token.created_at).toLocaleString("fr-FR")}
                    {token.last_used_at &&
                      ` · Dernière utilisation le ${new Date(token.last_used_at).toLocaleString("fr-FR")}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(token)}
                    className="text-gray-400 hover:text-brand-500"
                    aria-label={`Modifier le token ${token.name}`}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRevoke(token)}
                    className="text-gray-400 hover:text-error-500"
                    aria-label={`Révoquer le token ${token.name}`}
                  >
                    <TrashBinIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TokenFormModal
        isOpen={isFormOpen}
        token={editing}
        onClose={() => setIsFormOpen(false)}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      <RevealTokenModal token={created} onClose={() => setCreated(null)} />

      <PasswordConfirmDialog
        isOpen={pendingRevoke !== null}
        title="Révoquer ce token ?"
        description={`Toute intégration utilisant « ${pendingRevoke?.name} » perdra l'accès à l'API immédiatement. Cette action est irréversible.`}
        confirmLabel="Révoquer"
        onConfirm={(password) => handleRevoke(password)}
        onClose={() => setPendingRevoke(null)}
      />
    </ComponentCard>
  );
}

interface RegisterGrantDraft {
  register_id: number;
  can_read: boolean;
  can_write: boolean;
  allFieldsRead: boolean;
  fieldsRead: string[];
  allFieldsWrite: boolean;
  fieldsWrite: string[];
}

function grantsFromToken(token: ApiTokenSummary | null): Record<number, RegisterGrantDraft> {
  const map: Record<number, RegisterGrantDraft> = {};
  for (const g of token?.registers ?? []) {
    map[g.register_id] = {
      register_id: g.register_id,
      can_read: g.can_read,
      can_write: g.can_write,
      allFieldsRead: g.fields_read === null,
      fieldsRead: g.fields_read ?? [],
      allFieldsWrite: g.fields_write === null,
      fieldsWrite: g.fields_write ?? [],
    };
  }
  return map;
}

function TokenFormModal({
  isOpen,
  token,
  onClose,
  onCreated,
  onUpdated,
}: {
  isOpen: boolean;
  token: ApiTokenSummary | null;
  onClose: () => void;
  onCreated: (token: ApiTokenCreated) => void;
  onUpdated: () => void;
}) {
  const isEditing = token !== null;
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Record<ApiTokenScope, boolean>>({
    "registers:read": true,
    "registers:write": false,
  });
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [restrictRegisters, setRestrictRegisters] = useState(false);
  const [registers, setRegisters] = useState<RegisterSummary[]>([]);
  const [grants, setGrants] = useState<Record<number, RegisterGrantDraft>>({});
  const [fieldsByRegister, setFieldsByRegister] = useState<Record<number, Field[]>>({});

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setName(token?.name ?? "");
    setScopes({
      "registers:read": token?.scopes.includes("registers:read") ?? true,
      "registers:write": token?.scopes.includes("registers:write") ?? false,
    });
    setAssignedUserId(token?.assigned_user ? String(token.assigned_user.id) : "");
    setRestrictRegisters((token?.registers.length ?? 0) > 0);
    setGrants(grantsFromToken(token));
    setError(null);

    listTeam().then(setTeamMembers).catch(() => undefined);
    listRegisters().then(setRegisters).catch(() => undefined);
  }, [isOpen, token]);

  function toggleRegister(registerId: number, checked: boolean) {
    setGrants((prev) => {
      const next = { ...prev };
      if (checked) {
        next[registerId] = prev[registerId] ?? {
          register_id: registerId,
          can_read: true,
          can_write: false,
          allFieldsRead: true,
          fieldsRead: [],
          allFieldsWrite: true,
          fieldsWrite: [],
        };
        if (!fieldsByRegister[registerId]) {
          getRegister(registerId)
            .then((detail) =>
              setFieldsByRegister((prevFields) => ({ ...prevFields, [registerId]: detail.fields }))
            )
            .catch(() => undefined);
        }
      } else {
        delete next[registerId];
      }
      return next;
    });
  }

  function updateGrant(registerId: number, patch: Partial<RegisterGrantDraft>) {
    setGrants((prev) => ({
      ...prev,
      [registerId]: { ...prev[registerId], ...patch },
    }));
  }

  function toggleGrantField(
    registerId: number,
    action: "fieldsRead" | "fieldsWrite",
    fieldKey: string,
    checked: boolean
  ) {
    setGrants((prev) => {
      const current = prev[registerId];
      const list = checked
        ? [...current[action], fieldKey]
        : current[action].filter((k) => k !== fieldKey);
      return { ...prev, [registerId]: { ...current, [action]: list } };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom du token est obligatoire.");
      return;
    }
    const selectedScopes = (Object.keys(scopes) as ApiTokenScope[]).filter((s) => scopes[s]);
    if (selectedScopes.length === 0) {
      setError("Choisissez au moins une permission.");
      return;
    }

    let registerGrants: ApiTokenRegisterGrant[] | undefined;
    if (restrictRegisters) {
      const list = Object.values(grants);
      if (list.length === 0) {
        setError("Sélectionnez au moins un registre, ou désactivez la restriction.");
        return;
      }
      for (const g of list) {
        if (!g.can_read && !g.can_write) {
          setError("Chaque registre sélectionné doit avoir au moins lecture ou écriture.");
          return;
        }
        if (g.can_read && !g.allFieldsRead && g.fieldsRead.length === 0) {
          setError("Sélectionnez au moins une colonne en lecture, ou cochez « Toutes les colonnes ».");
          return;
        }
        if (g.can_write && !g.allFieldsWrite && g.fieldsWrite.length === 0) {
          setError("Sélectionnez au moins une colonne en écriture, ou cochez « Toutes les colonnes ».");
          return;
        }
      }
      registerGrants = list.map((g) => ({
        register_id: g.register_id,
        can_read: g.can_read,
        can_write: g.can_write,
        fields_read: g.allFieldsRead ? null : g.fieldsRead,
        fields_write: g.allFieldsWrite ? null : g.fieldsWrite,
      }));
    } else if (isEditing) {
      registerGrants = [];
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing && token) {
        await updateApiToken(token.id, {
          name: name.trim(),
          scopes: selectedScopes,
          assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
          registers: registerGrants,
        });
        onUpdated();
      } else {
        const created = await createApiToken({
          name: name.trim(),
          scopes: selectedScopes,
          assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
          registers: registerGrants,
        });
        onCreated(created);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Impossible ${isEditing ? "de modifier" : "de créer"} le token.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl m-4 p-6">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        {isEditing ? `Modifier « ${token?.name} »` : "Créer un token API"}
      </h4>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        {error && (
          <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
        <div>
          <Label>
            Nom <span className="text-error-500">*</span>
          </Label>
          <Input
            placeholder="ex : pont MCP"
            defaultValue={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>Permissions générales</Label>
          <div className="space-y-2">
            {(Object.keys(SCOPE_LABELS) as ApiTokenScope[]).map((scope) => (
              <div key={scope} className="flex items-center gap-3">
                <Checkbox
                  checked={scopes[scope]}
                  onChange={(checked) => setScopes((prev) => ({ ...prev, [scope]: checked }))}
                />
                <span className="text-sm font-normal text-gray-700 dark:text-gray-400">
                  {SCOPE_LABELS[scope]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label>Attribuer à (optionnel)</Label>
          <Select
            options={[
              { value: "", label: "Personne en particulier" },
              ...teamMembers.map((m) => ({ value: String(m.id), label: `${m.name} (${m.email})` })),
            ]}
            defaultValue={assignedUserId}
            onChange={setAssignedUserId}
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Étiquette de traçabilité uniquement - ne change pas ce que le token peut faire.
          </p>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <Checkbox checked={restrictRegisters} onChange={setRestrictRegisters} />
            <span className="text-sm font-normal text-gray-700 dark:text-gray-400">
              Restreindre à des registres et colonnes spécifiques
            </span>
          </div>
          {restrictRegisters && (
            <div className="mt-3 space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              {registers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun registre disponible.</p>
              )}
              {registers.map((register) => {
                const grant = grants[register.id];
                const isSelected = !!grant;
                const fields = fieldsByRegister[register.id] ?? [];
                return (
                  <div key={register.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={(checked) => toggleRegister(register.id, checked)}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {register.name}
                      </span>
                    </div>
                    {isSelected && grant && (
                      <div className="ml-7 mt-3 space-y-4">
                        <div className="flex items-center gap-5">
                          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Checkbox
                              checked={grant.can_read}
                              onChange={(checked) => updateGrant(register.id, { can_read: checked })}
                            />
                            Lecture
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Checkbox
                              checked={grant.can_write}
                              onChange={(checked) => updateGrant(register.id, { can_write: checked })}
                            />
                            Écriture
                          </label>
                        </div>

                        {grant.can_read && (
                          <div>
                            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                              Colonnes lisibles
                            </p>
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Checkbox
                                checked={grant.allFieldsRead}
                                onChange={(checked) => updateGrant(register.id, { allFieldsRead: checked })}
                              />
                              Toutes les colonnes
                            </label>
                            {!grant.allFieldsRead && (
                              <FieldChecklist
                                fields={fields}
                                selected={grant.fieldsRead}
                                onToggle={(key, checked) => toggleGrantField(register.id, "fieldsRead", key, checked)}
                              />
                            )}
                          </div>
                        )}

                        {grant.can_write && (
                          <div>
                            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                              Colonnes modifiables
                            </p>
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Checkbox
                                checked={grant.allFieldsWrite}
                                onChange={(checked) => updateGrant(register.id, { allFieldsWrite: checked })}
                              />
                              Toutes les colonnes
                            </label>
                            {!grant.allFieldsWrite && (
                              <FieldChecklist
                                fields={fields}
                                selected={grant.fieldsWrite}
                                onToggle={(key, checked) => toggleGrantField(register.id, "fieldsWrite", key, checked)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Enregistrement..."
                : "Création..."
              : isEditing
                ? "Enregistrer"
                : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FieldChecklist({
  fields,
  selected,
  onToggle,
}: {
  fields: Field[];
  selected: string[];
  onToggle: (key: string, checked: boolean) => void;
}) {
  return (
    <div className="ml-1 mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {fields.length === 0 && (
        <p className="col-span-full text-xs text-gray-400">Chargement des colonnes...</p>
      )}
      {fields.map((field) => (
        <label key={field.key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Checkbox checked={selected.includes(field.key)} onChange={(checked) => onToggle(field.key, checked)} />
          {field.label}
        </label>
      ))}
    </div>
  );
}

function RevealTokenModal({
  token,
  onClose,
}: {
  token: ApiTokenCreated | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [token]);

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      toast.success("Copié", "Le token a été copié dans le presse-papiers.");
    } catch {
      toast.error("Échec de la copie", "Copiez le token manuellement ci-dessous.");
    }
  }

  return (
    <Modal isOpen={token !== null} onClose={onClose} className="max-w-lg m-4 p-6">
      <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">
        Token créé : « {token?.name} »
      </h4>
      <div className="mb-4 rounded-lg border border-warning-500 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400">
        Copiez ce token maintenant : il ne sera plus jamais affiché ensuite (seule son empreinte est
        conservée). Collez-le tel quel dans la configuration de l&apos;intégration (ex. la variable
        MCP_API_TOKEN d&apos;un pont MCP).
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/5">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-gray-800 dark:text-white/90">
          {token?.token}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-gray-500 hover:text-brand-500 dark:text-gray-400"
          aria-label="Copier le token"
        >
          <CopyIcon />
        </button>
      </div>
      {copied && (
        <p className="mt-2 text-xs text-success-600 dark:text-success-400">Copié !</p>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="button" size="sm" onClick={onClose}>
          Terminé
        </Button>
      </div>
    </Modal>
  );
}
