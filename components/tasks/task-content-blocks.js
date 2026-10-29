"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "@/lib/uuid";
import {
  createEmptyCheckboxBlock,
  createEmptyRadioGroupBlock,
  createEmptyTableBlock,
} from "@/lib/content-blocks";
import { useUpdateTaskMutation } from "@/hooks/use-tasks";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";

function moveBlock(blocks, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= blocks.length) return blocks;
  const next = [...blocks];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function TaskContentBlocks({ task }) {
  const [blocks, setBlocks] = useState(task.contentBlocks || []);
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const expectedUpdatedAtRef = useRef(task.updatedAt);
  const debounceTimerRef = useRef(null);
  const updateTask = useUpdateTaskMutation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync blocks when server revision changes
    setBlocks(task.contentBlocks || []);
    expectedUpdatedAtRef.current = task.updatedAt;
  }, [task._id, task.updatedAt, task.contentBlocks]);

  const persist = useCallback(
    async (nextBlocks, { immediate = false } = {}) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const runSave = async () => {
        setSaveState("saving");
        setSaveError("");
        try {
          const data = await updateTask.mutateAsync({
            id: task._id,
            body: {
              contentBlocks: nextBlocks,
              expectedUpdatedAt: expectedUpdatedAtRef.current,
            },
          });
          expectedUpdatedAtRef.current = data.updatedAt;
          setBlocks(data.contentBlocks || []);
          setSaveState("saved");
        } catch (error) {
          setSaveState("error");
          setSaveError(error.message || "Failed to save content blocks");
        }
      };

      if (immediate) {
        await runSave();
        return;
      }

      debounceTimerRef.current = setTimeout(runSave, 600);
      setSaveState("pending");
    },
    [task._id, updateTask],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const updateBlocks = (updater, options) => {
    setBlocks((current) => {
      const next = updater(current);
      persist(next, options);
      return next;
    });
  };

  const addBlock = (factory) => {
    updateBlocks((current) => [...current, factory()], { immediate: true });
  };

  const removeBlock = (blockId) => {
    updateBlocks((current) => current.filter((block) => block.id !== blockId), {
      immediate: true,
    });
  };

  const updateBlock = (blockId, patch, options = {}) => {
    updateBlocks(
      (current) =>
        current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      options,
    );
  };

  const retrySave = () => {
    persist(blocks, { immediate: true });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Interactive content</h3>
          <p className="text-xs text-muted-foreground">
            Checkboxes, radio groups, and tables are saved to this task.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => addBlock(createEmptyCheckboxBlock)}
          >
            Add checkbox
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => addBlock(createEmptyRadioGroupBlock)}
          >
            Add radio group
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => addBlock(createEmptyTableBlock)}
          >
            Add table
          </Button>
        </div>
      </div>

      {saveState === "error" ? (
        <Alert variant="error">
          {saveError}{" "}
          <button type="button" className="underline" onClick={retrySave}>
            Retry
          </button>
        </Alert>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {saveState === "saving" && "Saving…"}
        {saveState === "pending" && "Unsaved changes (auto-saving)…"}
        {saveState === "saved" && "All changes saved"}
        {saveState === "idle" && blocks.length > 0 && "Ready"}
      </p>

      {blocks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          No interactive blocks yet. Add a checkbox, radio group, or table.
        </div>
      ) : null}

      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {block.type}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() =>
                    updateBlocks((current) => moveBlock(current, index, index - 1), {
                      immediate: true,
                    })
                  }
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === blocks.length - 1}
                  onClick={() =>
                    updateBlocks((current) => moveBlock(current, index, index + 1), {
                      immediate: true,
                    })
                  }
                >
                  Down
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => removeBlock(block.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {block.type === "checkbox" ? (
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(block.checked)}
                  onChange={(event) =>
                    updateBlock(
                      block.id,
                      { checked: event.target.checked },
                      { immediate: true },
                    )
                  }
                />
                <Input
                  value={block.label || ""}
                  onChange={(event) =>
                    updateBlock(block.id, { label: event.target.value })
                  }
                  aria-label="Checkbox label"
                />
              </label>
            ) : null}

            {block.type === "radioGroup" ? (
              <div className="space-y-3">
                <Input
                  value={block.groupLabel || ""}
                  onChange={(event) =>
                    updateBlock(block.id, { groupLabel: event.target.value })
                  }
                  aria-label="Radio group label"
                />
                <div className="space-y-2">
                  {(block.options || []).map((option) => (
                    <label key={option.id} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`radio-${block.id}`}
                        checked={block.selectedOptionId === option.id}
                        onChange={() =>
                          updateBlock(
                            block.id,
                            { selectedOptionId: option.id },
                            { immediate: true },
                          )
                        }
                      />
                      <Input
                        value={option.label || ""}
                        onChange={(event) => {
                          const options = (block.options || []).map((item) =>
                            item.id === option.id
                              ? { ...item, label: event.target.value }
                              : item,
                          );
                          updateBlock(block.id, { options });
                        }}
                        aria-label="Radio option label"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const options = (block.options || []).filter(
                            (item) => item.id !== option.id,
                          );
                          let selectedOptionId = block.selectedOptionId;
                          if (selectedOptionId === option.id) {
                            selectedOptionId = null;
                          }
                          updateBlock(
                            block.id,
                            { options, selectedOptionId },
                            { immediate: true },
                          );
                        }}
                      >
                        Remove
                      </Button>
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const newOption = {
                      id: randomUUID(),
                      label: `Option ${(block.options?.length || 0) + 1}`,
                    };
                    updateBlock(
                      block.id,
                      { options: [...(block.options || []), newOption] },
                      { immediate: true },
                    );
                  }}
                >
                  Add option
                </Button>
              </div>
            ) : null}

            {block.type === "table" ? (
              <div className="space-y-3 overflow-x-auto">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const colId = randomUUID();
                      const columns = [
                        ...(block.columns || []),
                        {
                          id: colId,
                          label: `Column ${(block.columns?.length || 0) + 1}`,
                        },
                      ];
                      const rows = (block.rows || []).map((row) => ({
                        ...row,
                        cells: [...(row.cells || []), { columnId: colId, value: "" }],
                      }));
                      updateBlock(block.id, { columns, rows }, { immediate: true });
                    }}
                  >
                    Add column
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const columns = block.columns || [];
                      const rowId = randomUUID();
                      const rows = [
                        ...(block.rows || []),
                        {
                          id: rowId,
                          cells: columns.map((col) => ({
                            columnId: col.id,
                            value: "",
                          })),
                        },
                      ];
                      updateBlock(block.id, { rows }, { immediate: true });
                    }}
                  >
                    Add row
                  </Button>
                </div>
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {(block.columns || []).map((column) => (
                        <th
                          key={column.id}
                          className="border border-border px-2 py-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={column.label || ""}
                              onChange={(event) => {
                                const columns = (block.columns || []).map((col) =>
                                  col.id === column.id
                                    ? { ...col, label: event.target.value }
                                    : col,
                                );
                                updateBlock(block.id, { columns });
                              }}
                              aria-label="Column header"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                const columns = (block.columns || []).filter(
                                  (col) => col.id !== column.id,
                                );
                                const rows = (block.rows || []).map((row) => ({
                                  ...row,
                                  cells: (row.cells || []).filter(
                                    (cell) => cell.columnId !== column.id,
                                  ),
                                }));
                                updateBlock(
                                  block.id,
                                  { columns, rows },
                                  { immediate: true },
                                );
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        </th>
                      ))}
                      <th className="border border-border px-2 py-1">Row</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(block.rows || []).map((row) => (
                      <tr key={row.id}>
                        {(block.columns || []).map((column) => {
                          const cell = (row.cells || []).find(
                            (item) => item.columnId === column.id,
                          ) || { columnId: column.id, value: "" };
                          return (
                            <td
                              key={`${row.id}-${column.id}`}
                              className="border border-border px-2 py-1"
                            >
                              <Input
                                value={cell.value || ""}
                                onChange={(event) => {
                                  const rows = (block.rows || []).map((r) => {
                                    if (r.id !== row.id) return r;
                                    const cells = [...(r.cells || [])];
                                    const idx = cells.findIndex(
                                      (c) => c.columnId === column.id,
                                    );
                                    if (idx >= 0) {
                                      cells[idx] = {
                                        ...cells[idx],
                                        value: event.target.value,
                                      };
                                    } else {
                                      cells.push({
                                        columnId: column.id,
                                        value: event.target.value,
                                      });
                                    }
                                    return { ...r, cells };
                                  });
                                  updateBlock(block.id, { rows });
                                }}
                              />
                            </td>
                          );
                        })}
                        <td className="border border-border px-2 py-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              const rows = (block.rows || []).filter(
                                (r) => r.id !== row.id,
                              );
                              updateBlock(block.id, { rows }, { immediate: true });
                            }}
                          >
                            Remove row
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
