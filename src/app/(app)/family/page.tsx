"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Crown, Trash2, UserPlus, Users } from "lucide-react";
import {
  useCreateFamily,
  useCreateInvite,
  useDeleteInvite,
  useFamily,
  useFamilyInvites,
  useFamilyMembers,
  useRemoveMember,
  useRenameFamily,
} from "@/lib/queries/family";
import { useCurrentUserId } from "@/lib/queries/auth";
import type { FamilyMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useToast } from "@/components/providers/toast-provider";
import { describeError } from "@/lib/utils";

function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${token}`;
}

function CreateFamilyCard() {
  const createFamily = useCreateFamily();
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createFamily.mutateAsync({ familyName, displayName });
    } catch (err) {
      setError(describeError(err, "לא הצלחנו ליצור משפחה. נסו שוב."));
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Users className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">יצירת משפחה</h2>
        <p className="text-sm text-muted">
          פתחו משפחה כדי לשתף מתכונים ורשימת קניות עם מי שתזמינו אליה.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="familyName" className="text-sm font-medium text-foreground">
            שם המשפחה
          </label>
          <Input
            id="familyName"
            required
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="לדוגמה: משפחת כהן"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="displayName" className="text-sm font-medium text-foreground">
            השם שלכם בתוך המשפחה
          </label>
          <Input
            id="displayName"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="לדוגמה: דנה"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" loading={createFamily.isPending} className="w-full">
          יצירת משפחה
        </Button>
      </form>
    </div>
  );
}

function InviteCard({ token, onRevoke }: { token: string; onRevoke: () => void }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(token);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("הקישור הועתק!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("ההעתקה נכשלה. נסו שוב.", "error");
    }
  }

  function handleWhatsApp() {
    const text = `הצטרפו למשפחה שלנו באפליקציית המתכונים: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-2 rounded-xl border border-accent/30 bg-accent/5 p-4">
      <p className="truncate text-xs text-muted" dir="ltr">
        {url}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={handleCopy}>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          העתקת קישור
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={handleWhatsApp}>
          <WhatsAppIcon className="size-4" />
          וואטסאפ
        </Button>
        <Button variant="ghost" size="sm" onClick={onRevoke} title="ביטול ההזמנה">
          <Trash2 className="size-4 text-danger" />
        </Button>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  canRemove,
  onRemove,
}: {
  member: FamilyMember;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
        {member.display_name.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {member.display_name}
          {member.role === "owner" && <Crown className="size-3.5 text-accent" />}
        </span>
      </span>
      {canRemove && (
        <button
          onClick={onRemove}
          title="הסרה מהמשפחה"
          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger cursor-pointer"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}

export default function FamilyPage() {
  const { data: userId } = useCurrentUserId();
  const { data: family, isLoading: familyLoading } = useFamily();
  const { data: members, isLoading: membersLoading } = useFamilyMembers();
  const { data: invites } = useFamilyInvites();
  const createInvite = useCreateInvite();
  const deleteInvite = useDeleteInvite();
  const removeMember = useRemoveMember();
  const renameFamily = useRenameFamily();
  const { showToast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  if (familyLoading || membersLoading) return <Spinner />;

  if (!family) return <CreateFamilyCard />;

  const myMembership = members?.find((m) => m.user_id === userId);
  const isOwner = myMembership?.role === "owner";
  const activeInvites = (invites ?? []).filter(
    (inv) => !inv.used_at && new Date(inv.expires_at) > new Date(),
  );

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!family || !nameDraft.trim()) return;
    try {
      await renameFamily.mutateAsync({ id: family.id, name: nameDraft.trim() });
      setEditingName(false);
    } catch (err) {
      showToast(describeError(err, "לא הצלחנו לעדכן את שם המשפחה."), "error");
    }
  }

  async function handleCreateInvite() {
    if (!family) return;
    try {
      await createInvite.mutateAsync({ familyId: family.id });
    } catch (err) {
      showToast(describeError(err, "לא הצלחנו ליצור קישור הזמנה."), "error");
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!confirm("להסיר את בן המשפחה הזה? הוא יאבד גישה למתכונים המשותפים.")) return;
    try {
      await removeMember.mutateAsync(memberUserId);
    } catch (err) {
      showToast(describeError(err, "לא הצלחנו להסיר את בן המשפחה."), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        {editingName ? (
          <form onSubmit={handleRename} className="flex items-center gap-2">
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" loading={renameFamily.isPending}>
              שמירה
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditingName(false)}>
              ביטול
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted">שם המשפחה</p>
              <p className="text-lg font-semibold text-foreground">{family.name}</p>
            </div>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNameDraft(family.name);
                  setEditingName(true);
                }}
              >
                עריכה
              </Button>
            )}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">בני המשפחה</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {(members ?? []).map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              canRemove={isOwner && member.user_id !== userId}
              onRemove={() => handleRemoveMember(member.user_id)}
            />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">הזמנת בני משפחה</h2>
        <p className="text-sm text-muted">
          שלחו קישור הזמנה למי שתרצו להוסיף — הוא ייצור חשבון ויצטרף אוטומטית לספר המתכונים
          המשותף שלכם.
        </p>

        {activeInvites.map((inv) => (
          <InviteCard
            key={inv.id}
            token={inv.token}
            onRevoke={async () => {
              try {
                await deleteInvite.mutateAsync(inv.id);
              } catch (err) {
                showToast(describeError(err, "לא הצלחנו לבטל את ההזמנה."), "error");
              }
            }}
          />
        ))}

        <Button
          variant="secondary"
          className="w-full"
          loading={createInvite.isPending}
          onClick={handleCreateInvite}
        >
          <UserPlus className="size-4" />
          יצירת קישור הזמנה
        </Button>
      </section>
    </div>
  );
}
