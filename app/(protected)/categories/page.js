"use client";

import { useState } from "react";
import { useCategories, useCategoryMutations } from "@/hooks/use-categories";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import EmptyState from "@/components/ui/empty-state";

export default function CategoriesPage() {
  const categoriesQuery = useCategories();
  const { create, update, remove } = useCategoryMutations();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  if (categoriesQuery.isLoading) {
    return <Spinner label="Loading categories…" />;
  }

  const items = categoriesQuery.data?.items || [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Organize tasks with simple categories
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await create.mutateAsync({ name: newName });
            setNewName("");
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <Input
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <Button type="submit" disabled={create.isPending}>
          Create
        </Button>
      </form>

      {!items.length ? (
        <EmptyState title="No categories" description="Create one to tag tasks." />
      ) : (
        <ul className="space-y-2">
          {items.map((category) => (
            <li
              key={category._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              {editingId === category._id ? (
                <form
                  className="flex flex-1 flex-wrap gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setError("");
                    try {
                      await update.mutateAsync({
                        id: category._id,
                        body: { name: editingName },
                      });
                      setEditingId(null);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={update.isPending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.taskCount} task(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(category._id);
                        setEditingName(category.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="danger"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Delete this category? Tasks will keep their data but lose this category.",
                          )
                        ) {
                          return;
                        }
                        setError("");
                        try {
                          await remove.mutateAsync(category._id);
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
