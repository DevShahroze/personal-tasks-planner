"use client";

import { useMemo, useState } from "react";
import SearchableSelect from "@/components/ui/searchable-select";
import CategoryQuickAddModal from "@/components/categories/category-quick-add-modal";
import { useAppCategories } from "@/contexts/app-data-context";

function initialCategoryId(initialValues) {
  return initialValues?.category?._id || initialValues?.category || "";
}

export default function TaskCategoryField({ categoryId, onCategoryIdChange }) {
  const { items } = useAppCategories();
  const [modalOpen, setModalOpen] = useState(false);

  const options = useMemo(
    () =>
      items.map((cat) => ({
        value: String(cat._id),
        label: cat.name,
      })),
    [items],
  );

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">Category</span>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setModalOpen(true)}
        >
          Add category
        </button>
      </div>
      <SearchableSelect
        value={categoryId}
        onChange={onCategoryIdChange}
        options={options}
        ariaLabel="Category"
        searchPlaceholder="Search categories…"
        emptyOptionLabel="None"
      />
      <CategoryQuickAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(category) => {
          onCategoryIdChange(String(category._id));
        }}
      />
    </div>
  );
}

export { initialCategoryId };
