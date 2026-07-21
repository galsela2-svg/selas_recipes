"use client";

import { useState, type FormEvent } from "react";
import { Check, Pencil, Pin, PinOff, Plus, Search, Trash2, X } from "lucide-react";
import {
  useAddKnownItem,
  useDeleteKnownItem,
  useKnownItemsDetailed,
  useRenameKnownItem,
  useTogglePinKnownItem,
} from "@/lib/queries/known-items";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function KnownItemsManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: items } = useKnownItemsDetailed();
  const addItem = useAddKnownItem();
  const renameItem = useRenameKnownItem();
  const togglePin = useTogglePinKnownItem();
  const deleteItem = useDeleteKnownItem();

  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPinned, setNewPinned] = useState(true);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = (items ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    addItem.mutate(
      { name: newName, pinned: newPinned },
      { onSuccess: () => setNewName("") },
    );
  }

  function startEdit(name: string) {
    setEditingName(name);
    setEditValue(name);
  }

  function commitEdit() {
    if (!editingName) return;
    if (editValue.trim() && editValue.trim() !== editingName) {
      renameItem.mutate({ oldName: editingName, newName: editValue });
    }
    setEditingName(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="ניהול פריטים נפוצים">
      <div className="space-y-4">
        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="הוספת פריט קבוע..."
              className="flex-1"
            />
            <Button type="submit" size="sm" loading={addItem.isPending}>
              <Plus className="size-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={newPinned}
              onChange={(e) => setNewPinned(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            הצמד לתחילת הרשימה
          </label>
        </form>

        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="ps-9"
          />
        </div>

        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.map((item) => (
            <li
              key={item.name}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              {editingName === item.name ? (
                <>
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditingName(null);
                    }}
                    className="h-8 flex-1"
                  />
                  <button
                    onClick={commitEdit}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-success hover:bg-surface-2 cursor-pointer"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => setEditingName(null)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm text-foreground">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{item.use_count}×</span>
                  <button
                    onClick={() =>
                      togglePin.mutate({ name: item.name, pinned: !item.pinned })
                    }
                    title={item.pinned ? "בטל הצמדה" : "הצמד"}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md cursor-pointer",
                      item.pinned
                        ? "text-accent hover:bg-surface-2"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {item.pinned ? (
                      <Pin className="size-4 fill-accent" />
                    ) : (
                      <PinOff className="size-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(item.name)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground cursor-pointer"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => deleteItem.mutate(item.name)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-danger cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-muted">אין פריטים תואמים.</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
