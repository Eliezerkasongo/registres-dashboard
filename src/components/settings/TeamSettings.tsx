"use client";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Switch from "@/components/form/switch/Switch";
import PasswordConfirmDialog from "@/components/registers/PasswordConfirmDialog";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api/client";
import { deleteTeamMember, inviteTeamMember, listTeam, updateTeamMember } from "@/lib/api/team";
import type { TeamMember, TeamMemberInvited } from "@/lib/api/types";
import { CopyIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import React, { useEffect, useState } from "react";

export default function TeamSettings() {
  const toast = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invited, setInvited] = useState<TeamMemberInvited | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // The admin managing this page is the one who invites people - they show
  // up in "Mon profil", not as an entry to manage in their own team list.
  const visibleMembers = members.filter((member) => member.id !== user?.id);

  function reload() {
    setIsLoading(true);
    listTeam()
      .then(setMembers)
      .catch(() => toast.error("Erreur", "Impossible de charger l'équipe."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleActiveChange(member: TeamMember, isActive: boolean) {
    try {
      await updateTeamMember(member.id, { is_active: isActive });
      toast.success(isActive ? "Compte réactivé" : "Compte désactivé");
      reload();
    } catch (err) {
      toast.error(
        "Échec de la mise à jour",
        err instanceof ApiError ? err.message : "Une erreur est survenue."
      );
    }
  }

  async function handleDelete(password: string) {
    if (!pendingDelete) return;
    await deleteTeamMember(pendingDelete.id, password);
    toast.success("Membre supprimé", `"${pendingDelete.name}" a été retiré de l'équipe.`);
    setPendingDelete(null);
    reload();
  }

  return (
    <ComponentCard
      title="Équipe"
      desc="Invitez des collègues à rejoindre votre organisation et gérez leur rôle."
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" startIcon={<PlusIcon />} onClick={() => setIsInviteOpen(true)}>
            Inviter un collègue
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
        ) : (
          <div className="space-y-3">
            {visibleMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white/90">{member.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <Badge size="sm" color={member.role === "admin" ? "primary" : "light"}>
                      {member.role === "admin" ? "Admin" : "Membre"}
                    </Badge>
                    <Badge size="sm" color={member.is_active ? "success" : "light"}>
                      {member.is_active ? "Actif" : "Désactivé"}
                    </Badge>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    label=""
                    defaultChecked={member.is_active}
                    onChange={(checked) => handleActiveChange(member, checked)}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingMember(member)}
                    className="shrink-0 text-gray-400 hover:text-brand-500"
                    aria-label={`Modifier ${member.name}`}
                    title="Modifier"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(member)}
                    className="shrink-0 text-gray-400 hover:text-error-500"
                    aria-label={`Supprimer ${member.name}`}
                    title="Supprimer de l'équipe"
                  >
                    <TrashBinIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvited={(member) => {
          setInvited(member);
          setIsInviteOpen(false);
          reload();
        }}
      />

      <RevealPasswordModal member={invited} onClose={() => setInvited(null)} />

      <EditMemberModal
        key={editingMember?.id ?? "none"}
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onSaved={() => {
          setEditingMember(null);
          reload();
        }}
      />

      <PasswordConfirmDialog
        isOpen={pendingDelete !== null}
        title="Supprimer ce membre de l'équipe ?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" ne pourra plus se connecter et disparaîtra de cette liste.`
            : undefined
        }
        irreversible
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </ComponentCard>
  );
}

function InviteModal({
  isOpen,
  onClose,
  onInvited,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvited: (member: TeamMemberInvited) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setError(null);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Le nom et l'email sont obligatoires.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Le rôle Admin ne se distribue plus depuis cette page - un collègue
      // invité ici est toujours simple membre.
      const member = await inviteTeamMember({ name: name.trim(), email: email.trim(), role: "member" });
      onInvited(member);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'inviter ce collègue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg m-4 p-6">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Inviter un collègue
      </h4>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
        <div>
          <Label>
            Nom <span className="text-error-500">*</span>
          </Label>
          <Input defaultValue={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>
            Email <span className="text-error-500">*</span>
          </Label>
          <Input type="email" defaultValue={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Invitation..." : "Inviter"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  // Rendered with key={member?.id} at the call site, so switching to a
  // different member (or reopening after a cancelled edit) always mounts a
  // fresh instance - the source-of-truth values below are only ever read
  // once, right when that instance is born, no useEffect reset needed.
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    if (!name.trim() || !email.trim()) {
      setError("Le nom et l'email sont obligatoires.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateTeamMember(member.id, { name: name.trim(), email: email.trim() });
      toast.success("Membre mis à jour");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de mettre à jour ce membre.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={member !== null} onClose={onClose} className="max-w-lg m-4 p-6">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Modifier {member?.name}
      </h4>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-error-500 bg-error-50 px-4 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
        <div>
          <Label>
            Nom <span className="text-error-500">*</span>
          </Label>
          <Input defaultValue={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>
            Email <span className="text-error-500">*</span>
          </Label>
          <Input type="email" defaultValue={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RevealPasswordModal({
  member,
  onClose,
}: {
  member: TeamMemberInvited | null;
  onClose: () => void;
}) {
  const toast = useToast();

  async function handleCopy() {
    if (!member) return;
    try {
      await navigator.clipboard.writeText(member.temporary_password);
      toast.success("Copié", "Le mot de passe a été copié dans le presse-papiers.");
    } catch {
      toast.error("Échec de la copie", "Copiez le mot de passe manuellement ci-dessous.");
    }
  }

  return (
    <Modal isOpen={member !== null} onClose={onClose} className="max-w-lg m-4 p-6">
      <h4 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">
        « {member?.name} » invité(e)
      </h4>
      <div className="mb-4 rounded-lg border border-warning-500 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400">
        Transmettez ce mot de passe temporaire à {member?.name} maintenant : il ne sera plus jamais
        affiché ensuite. Il devra le changer après sa première connexion (email : {member?.email}).
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/5">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-gray-800 dark:text-white/90">
          {member?.temporary_password}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-gray-500 hover:text-brand-500 dark:text-gray-400"
          aria-label="Copier le mot de passe"
        >
          <CopyIcon />
        </button>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="button" size="sm" onClick={onClose}>
          Terminé
        </Button>
      </div>
    </Modal>
  );
}
