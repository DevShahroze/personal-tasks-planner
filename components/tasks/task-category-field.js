"use client";

import { useState } from "react";
import Select from "@/components/ui/select";
import CategoryQuickAddModal from "@/components/categories/category-quick-add-modal";
import { useAppCategories } from "@/contexts/app-data-context";

function initialCategoryId(initialValues) {
  return initialValues?.category?._id || initialValues?.category || "";
}

export default function TaskCategoryField({ categoryId, onCategoryIdChange }) {
  const { items } = useAppCategories();
  const [modalOpen, setModalOpen] = useState(false);

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
      <Select
        value={categoryId}
        onChange={(event) => onCategoryIdChange(event.target.value)}
      >
        <option value="">None</option>
        {items.map((cat) => (
          <option key={cat._id} value={cat._id}>
            {cat.name}
          </option>
        ))}
      </Select>
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
