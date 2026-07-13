import { useEffect, useState } from "react";
import { X } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { useCategories } from "@/features/categories/useCategories";
import {
  CategoryIcon,
  PICKABLE_ICONS,
  PICKABLE_COLORS,
} from "@/features/categories/icons";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

/**
 * Create or edit a category. Live preview, name field, colour + icon pickers.
 * Pass `category` to edit an existing one; omit it to create. On create the new
 * id is handed back via `onCreated` so the caller can auto-select it.
 */
export default function AddCategorySheet({
  open,
  onClose,
  onCreated,
  category,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  category?: Category | null;
}) {
  const { addCategory, updateCategory } = useCategories();
  const editing = !!category;
  const [name, setName] = useState("");
  const [color, setColor] = useState(PICKABLE_COLORS[5]);
  const [icon, setIcon] = useState(PICKABLE_ICONS[0]);
  const [busy, setBusy] = useState(false);

  // Sync fields whenever the target category (or add/edit mode) changes.
  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setColor(category?.color ?? PICKABLE_COLORS[5]);
    setIcon(category?.icon ?? PICKABLE_ICONS[0]);
  }, [open, category]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      if (editing && category) {
        await updateCategory(category.id, { name: trimmed, icon, color });
      } else {
        const id = await addCategory({ name: trimmed, icon, color });
        if (id) onCreated?.(id);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">
          {editing ? "Edit category" : "New category"}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted"
        >
          <X size={18} />
        </button>
      </div>

      {/* Live preview */}
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: color + "26", color }}
        >
          <CategoryIcon name={icon} size={24} />
        </span>
        <div>
          <div className="text-[17px] font-bold">{name || "New category"}</div>
          <div className="text-sm text-muted">Preview</div>
        </div>
      </div>

      <input
        className="input mb-4"
        placeholder="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <div className="mb-2 text-xs font-semibold text-muted">Colour</div>
      <div className="mb-4 flex flex-wrap gap-2.5">
        {PICKABLE_COLORS.map((col) => (
          <button
            key={col}
            onClick={() => setColor(col)}
            aria-label={`Colour ${col}`}
            className={cn(
              "h-9 w-9 rounded-full ring-1 ring-border",
              col === color && "ring-4 ring-text",
            )}
            style={{ background: col }}
          />
        ))}
      </div>

      <div className="mb-2 text-xs font-semibold text-muted">Icon</div>
      <div className="mb-5 flex flex-wrap gap-2">
        {PICKABLE_ICONS.map((ic) => {
          const active = ic === icon;
          return (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              aria-label={`Icon ${ic}`}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border transition",
                active ? "border-[1.5px]" : "border-transparent bg-card",
              )}
              style={
                active
                  ? { background: color + "22", borderColor: color, color }
                  : undefined
              }
            >
              <CategoryIcon name={ic} size={20} />
            </button>
          );
        })}
      </div>

      <button
        onClick={submit}
        disabled={!name.trim() || busy}
        className="btn-brand w-full disabled:bg-border disabled:text-muted"
      >
        {editing ? "Save changes" : "Create category"}
      </button>
    </BottomSheet>
  );
}
