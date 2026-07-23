"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";

const LONG_PRESS_MS = 500;

// A dietary-tag badge the user created themselves (via the "+" button) —
// unlike the curated preset options, these can be renamed or removed.
// Long-pressing (mouse or touch, via Pointer Events) opens a small menu
// instead of toggling selection; a normal tap still toggles as usual.
export function EditableTag({
  tag,
  active,
  onToggle,
  onRename,
  onDelete,
}: {
  tag: string;
  active: boolean;
  onToggle: () => void;
  onRename: (next: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tag);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  function startPress() {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function handleClick() {
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    onToggle();
  }

  function commitRename() {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === tag) {
      setDraft(tag);
      return;
    }
    onRename(trimmed);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitRename();
          } else if (e.key === "Escape") {
            setEditing(false);
            setDraft(tag);
          }
        }}
        onBlur={commitRename}
        className="h-7 w-28 rounded-full border border-accent/50 bg-surface px-2.5 text-xs text-foreground outline-none"
      />
    );
  }

  return (
    <span className="relative inline-block">
      <Badge
        active={active}
        onClick={handleClick}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
      >
        {tag}
      </Badge>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-full z-20 mt-1 flex overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDraft(tag);
                setEditing(true);
              }}
              className="px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2 cursor-pointer"
            >
              עריכה
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="border-r border-border px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-surface-2 cursor-pointer"
            >
              מחיקה
            </button>
          </div>
        </>
      )}
    </span>
  );
}
