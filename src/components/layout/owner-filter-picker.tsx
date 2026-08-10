"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { getMemberColorPreset, useFamilyMembers } from "@/lib/queries/family";
import { useOwnerFilter } from "@/components/providers/owner-filter-provider";
import { cn } from "@/lib/utils";

/** Compact "who made it" picker for the dashboard's top header — a single
 * button showing whichever scope is active ("הכול" or a member), expanding
 * into a dropdown to switch. Replaces a full row of always-visible chips
 * so the header stays a single line. Only rendered when there's more than
 * one family member (a solo family has nothing to filter by). */
export function OwnerFilterPicker() {
  const { data: familyMembers } = useFamilyMembers();
  const { ownerFilter, setOwnerFilter } = useOwnerFilter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!familyMembers || familyMembers.length <= 1) return null;

  const activeMember = familyMembers.find((m) => m.user_id === ownerFilter) ?? null;
  const preset = activeMember ? getMemberColorPreset(activeMember.color) : null;
  const color = preset?.color ?? "var(--accent)";
  const foreground = preset?.foreground ?? "var(--accent-foreground)";
  const label = activeMember?.display_name ?? "הכול";

  function select(userId: string | null) {
    setOwnerFilter(userId);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors cursor-pointer"
        style={{ borderColor: color, backgroundColor: color, color: foreground }}
      >
        {!activeMember && <Users className="size-3" />}
        <span className="max-w-16 truncate">{label}</span>
        <ChevronDown className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-30 mt-1.5 min-w-32 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
          <button
            onClick={() => select(null)}
            className={cn(
              "flex w-full items-center gap-1.5 px-3 py-2 text-start text-sm font-medium cursor-pointer hover:bg-surface-2",
              ownerFilter === null ? "text-accent" : "text-foreground",
            )}
          >
            <Users className="size-3.5" />
            הכול
          </button>
          {familyMembers.map((member) => {
            const memberPreset = getMemberColorPreset(member.color);
            const active = ownerFilter === member.user_id;
            return (
              <button
                key={member.user_id}
                onClick={() => select(member.user_id)}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-start text-sm font-medium cursor-pointer hover:bg-surface-2"
                style={active ? { color: memberPreset?.color ?? "var(--accent)" } : undefined}
              >
                {member.display_name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
