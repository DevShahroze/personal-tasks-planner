"use client";

import { useMemo, useState } from "react";
import { useCategories, useCategoryMutations } from "@/hooks/use-categories";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/format";
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
    <div className="page-stack mx-auto max-w-4xl">
      <div>
        <h1 className="page-title">Categories</h1>
        <p className="page-lead">Organize tasks with simple categories</p>
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
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="max-h-[min(32rem,calc(100dvh-12rem))] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-left shadow-[inset_0_-1px_0_var(--border)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium text-right">Tasks</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((category) => {
                  const isUnassigned = category.name === UNASSIGNED_CATEGORY_NAME;
                  const isEditing = editingId === category._id;
                  return (
                    <tr key={category._id} className="border-t border-border">
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <form
                            className="flex flex-wrap items-center gap-2"
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
                              className="min-w-[12rem]"
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
                          <span className="font-medium">{category.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {category.taskCount}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(category.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? null : (
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setEditingId(category._id);
                                setEditingName(category.name);
                              }}
                            >
                              Rename
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              disabled={isUnassigned}
                              onClick={() => setDeleteTarget(category)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
