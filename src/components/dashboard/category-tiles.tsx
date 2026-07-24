"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  CATEGORY_TILE_CATALOG,
  TILE_CATALOG_BY_KEY,
  tileKey,
  type CategoryTile,
} from "@/lib/quick-filter-tiles";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 500;

// A single scrollable row of small quick-filter shortcuts, user-customizable:
// long-press removes one, "+" at the end opens a picker for adding more from
// the full catalog. Which tiles are active (and their order) is handed in
// from the dashboard, which persists it via useSettings.
export function CategoryTiles({
  tileKeys,
  onTileKeysChange,
  isActive,
  onSelect,
}: {
  tileKeys: string[];
  onTileKeysChange: (keys: string[]) => void;
  isActive: (tile: CategoryTile) => boolean;
  onSelect: (tile: CategoryTile) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const tiles = tileKeys
    .map((key) => TILE_CATALOG_BY_KEY.get(key))
    .filter((t): t is CategoryTile => Boolean(t));

  function removeTile(key: string) {
    onTileKeysChange(tileKeys.filter((k) => k !== key));
  }

  function addTile(key: string) {
    if (!tileKeys.includes(key)) onTileKeysChange([...tileKeys, key]);
  }

  const availableToAdd = CATEGORY_TILE_CATALOG.filter((t) => !tileKeys.includes(tileKey(t)));
  const groupedAvailable = new Map<string, CategoryTile[]>();
  for (const tile of availableToAdd) {
    const groupLabel = tile.kind === "dietary" ? tile.group : "אחר";
    groupedAvailable.set(groupLabel, [...(groupedAvailable.get(groupLabel) ?? []), tile]);
  }

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {tiles.map((tile) => (
          <QuickFilterTile
            key={tileKey(tile)}
            tile={tile}
            active={isActive(tile)}
            onSelect={() => onSelect(tile)}
            onRemove={() => removeTile(tileKey(tile))}
          />
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          title="הוספת כפתור קטגוריה"
          className="flex w-12 shrink-0 flex-col items-center gap-1 rounded-xl border border-dashed border-border py-2 text-muted transition-colors hover:border-accent/50 hover:text-accent cursor-pointer"
        >
          <Plus className="size-4" />
          <span className="text-[10px] font-medium leading-tight">הוספה</span>
        </button>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="הוספת כפתורי קטגוריה">
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {groupedAvailable.size === 0 && (
            <p className="text-sm text-muted">כל הקטגוריות כבר מוצגות.</p>
          )}
          {[...groupedAvailable.entries()].map(([groupLabel, groupTiles]) => (
            <div key={groupLabel} className="space-y-1.5">
              <p className="text-xs font-medium text-muted">{groupLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {groupTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tileKey(tile)}
                      type="button"
                      onClick={() => addTile(tileKey(tile))}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/50 cursor-pointer"
                    >
                      <Icon className="size-3.5" />
                      {tile.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

function QuickFilterTile({
  tile,
  active,
  onSelect,
  onRemove,
}: {
  tile: CategoryTile;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const Icon = tile.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  function startPress() {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onRemove();
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
    onSelect();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      title="לחיצה ארוכה להסרה"
      className={cn(
        "flex w-12 shrink-0 flex-col items-center gap-1 rounded-xl border py-2 text-center transition-colors cursor-pointer",
        active ? "border-accent bg-accent/15" : "border-border bg-surface hover:border-accent/40",
      )}
    >
      <Icon className={cn("size-4", active ? "text-accent" : "text-muted")} strokeWidth={1.75} />
      <span
        className={cn(
          "line-clamp-1 text-[10px] font-medium leading-tight",
          active ? "text-accent" : "text-muted",
        )}
      >
        {tile.label}
      </span>
    </button>
  );
}
