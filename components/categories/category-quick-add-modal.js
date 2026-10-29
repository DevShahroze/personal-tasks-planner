"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";
import { useAppCategories } from "@/contexts/app-data-context";

export default function CategoryQuickAddModal({ open, onClose, onCreated }) {
  const { create, creating } = useAppCategories();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setError("");
    try {
      const category = await create({ name: trimmed });
      onCreated?.(category);
      handleClose();
    } catch (err) {
      setError(err.message || "Could not create category");
    }
  };

  return (
    <Modal open={open} title="Add category" onClose={handleClose}>
      <div className="space-y-3">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <label className="block space-y-1 text-sm">
          <span>Name *</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            required
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
            }}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" disabled={creating || !name.trim()} onClick={save}>
            {creating ? "Creating…" : "Create category"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
