"use client";

import { useState } from "react";
import { Pencil, ShieldAlert, Trash2, Users } from "lucide-react";
import {
  useAdminRemoveMember,
  useAdminRenameMember,
  useAdminUsers,
} from "@/lib/queries/family";
import { useCurrentUserEmail, useCurrentUserId } from "@/lib/queries/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/providers/toast-provider";
import { describeError } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/types";

const ADMIN_EMAIL = "galsela2@gmail.com";

function UserRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const { showToast } = useToast();
  const renameMember = useAdminRenameMember();
  const removeMember = useAdminRemoveMember();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.display_name ?? "");

  async function handleRename() {
    if (!nameDraft.trim()) return;
    try {
      await renameMember.mutateAsync({ userId: user.user_id, name: nameDraft.trim() });
      setEditing(false);
    } catch (err) {
      showToast(describeError(err, "לא הצלחנו לעדכן את השם."));
    }
  }

  async function handleRemove() {
    if (
      !confirm(
        `להסיר את ${user.display_name ?? user.email} מהמשפחה "${user.family_name}"? הם יאבדו גישה למתכונים המשותפים.`,
      )
    )
      return;
    try {
      await removeMember.mutateAsync(user.user_id);
    } catch (err) {
      showToast(describeError(err, "לא הצלחנו להסיר את המשתמש."));
    }
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" dir="ltr">
          {user.email}
        </p>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="h-8 max-w-40 text-sm"
            />
            <Button size="sm" onClick={handleRename} loading={renameMember.isPending}>
              שמירה
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setNameDraft(user.display_name ?? "");
              }}
            >
              ביטול
            </Button>
          </div>
        ) : (
          <p className="mt-0.5 text-xs text-muted">
            {user.family_name ? (
              <>
                {user.display_name} · משפחת {user.family_name}
                {user.role === "owner" && " · בעל/ת המשפחה"}
              </>
            ) : (
              "ללא משפחה"
            )}
          </p>
        )}
      </div>

      {!editing && user.family_id && (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setEditing(true)}
            title="עריכת שם תצוגה"
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground cursor-pointer"
          >
            <Pencil className="size-4" />
          </button>
          {!isSelf && (
            <button
              onClick={handleRemove}
              title="הסרה מהמשפחה"
              className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger cursor-pointer"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function AdminUsersPage() {
  const { data: email, isLoading: emailLoading } = useCurrentUserEmail();
  const { data: userId } = useCurrentUserId();
  const { data: users, isLoading: usersLoading, isError, error } = useAdminUsers();

  if (emailLoading) return <Spinner />;

  if (email !== ADMIN_EMAIL) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="אין הרשאה"
        description="המסך הזה זמין רק לבעל/ת האפליקציה."
      />
    );
  }

  if (usersLoading) return <Spinner />;

  if (isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="לא הצלחנו לטעון את רשימת המשתמשים"
        description={describeError(
          error,
          "ודאו שהרצתם מחדש את supabase/schema.sql — הפונקציה admin_list_users צריכה להיות מוגדרת שם.",
        )}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted">
        כל מי שנרשם לאפליקציה, בכל המשפחות. אפשר לערוך שם תצוגה או להסיר מהמשפחה שלו.
      </p>

      {!users || users.length === 0 ? (
        <EmptyState icon={Users} title="אין עדיין משתמשים" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {users.map((user) => (
            <UserRow key={user.user_id} user={user} isSelf={user.user_id === userId} />
          ))}
        </ul>
      )}
    </div>
  );
}
