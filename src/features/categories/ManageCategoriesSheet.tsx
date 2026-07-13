import { useState } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import AddCategorySheet from "@/features/categories/AddCategorySheet";
import { useCategories } from "@/features/categories/useCategories";
import { CategoryIcon } from "@/features/categories/icons";
import type { Category } from "@/lib/types";

/**
 * Manage the user's categories: add, edit (name/colour/icon), delete.
 * Changes flow straight to Firestore, so the Add screen grid reflects them live.
 */
export default function ManageCategoriesSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { categories, deleteCategory } = useCategories();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setEditorOpen(true);
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Manage categories</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 space-y-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: c.color + "33", color: c.color }}
              >
                <CategoryIcon name={c.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {c.name}
              </span>

              {confirmId === c.id ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await deleteCategory(c.id);
                      setConfirmId(null);
                    }}
                    className="rounded-lg bg-bad px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg bg-card px-2.5 py-1 text-xs font-semibold text-muted"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-text"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmId(c.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-bad"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={openAdd}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-brand-soft py-3 text-sm font-semibold text-brand-soft"
        >
          <Plus size={18} />
          New category
        </button>
      </BottomSheet>

      <AddCategorySheet
        open={editorOpen}
        category={editing}
        onClose={() => setEditorOpen(false)}
      />
    </>
  );
}
