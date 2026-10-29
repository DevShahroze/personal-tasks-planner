"use client";

import { useMemo, useState } from "react";
import { useCategories, useCategoryMutations } from "@/hooks/use-categories";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/constants";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import Alert from "@/components/ui/alert";
import EmptyState from "@/components/ui/empty-state";
import Modal from "@/components/ui/modal";

export default function CategoriesPage() {
  const categoriesQuery = useCategories();
  const { create, update, remove } = useCategoryMutations();
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const items = categoriesQuery.data?.items || [];
  const searchTrimmed = search.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!searchTrimmed) {
      return items;
    }
    return items.filter((category) =>
      category.name.toLowerCase().includes(searchTrimmed),
    );
  }, [items, searchTrimmed]);

  if (categoriesQuery.isLoading) {
    return <Spinner label="Loading categories…" />;
  }

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

      {items.length ? (
        <Input
          type="search"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search categories"
        />
      ) : null}

      {!items.length ? (
        <EmptyState title="No categories" description="Create one to tag tasks." />
      ) : !filteredItems.length ? (
        <EmptyState
          title="No matches"
          description={`No categories match “${search.trim()}”.`}
        />
      ) : (
        <ul className="space-y-2">
          {filteredItems.map((category) => {
            const isUnassigned = category.name === UNASSIGNED_CATEGORY_NAME;
            return (
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
                        disabled={isUnassigned}
                        onClick={() => setDeleteTarget(category)}
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete category?"
        onClose={() => {
          if (!remove.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Delete{" "}
              <span className="font-medium text-foreground">{deleteTarget.name}</span>?
              {deleteTarget.taskCount > 0 ? (
                <>
                  {" "}
                  {deleteTarget.taskCount} linked task
                  {deleteTarget.taskCount === 1 ? "" : "s"} will move to{" "}
                  <span className="font-medium text-foreground">
                    {UNASSIGNED_CATEGORY_NAME}
                  </span>
                  .
                </>
              ) : (
                <> This cannot be undone.</>
              )}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={remove.isPending}
                onClick={async () => {
                  setError("");
                  try {
                    await remove.mutateAsync(deleteTarget._id);
                    setDeleteTarget(null);
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                {remove.isPending ? "Deleting…" : "Delete category"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
