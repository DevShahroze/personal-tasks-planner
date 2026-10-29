"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { searchApi } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { useDebounce } from "@/hooks/use-debounce";
import { useEntityLinks } from "@/hooks/use-entity-links";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Alert from "@/components/ui/alert";

export default function EntityLinksPanel({
  entityType,
  entityId,
  linkedThoughts = [],
  linkedPlans = [],
  linkedTasks = [],
}) {
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState(
    entityType === "task" ? "thought" : "task",
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const links = useEntityLinks(entityType, entityId);

  const optionsQuery = useQuery({
    queryKey: queryKeys.searchOptions(debouncedSearch),
    queryFn: () => searchApi.options(debouncedSearch),
    enabled: open,
  });

  const linkItem = async (item) => {
    setError("");
    try {
      if (entityType === "task" && targetType === "thought") {
        await links.linkThoughtToTask.mutateAsync(item._id);
      } else if (entityType === "task" && targetType === "plan") {
        await links.linkPlanToTask.mutateAsync(item._id);
      } else if (entityType === "thought" && targetType === "task") {
        await links.linkTaskToThought.mutateAsync(item._id);
      } else if (entityType === "thought" && targetType === "plan") {
        await links.linkPlanToThought.mutateAsync(item._id);
      } else if (entityType === "plan" && targetType === "task") {
        await links.linkTaskToPlan.mutateAsync(item._id);
      } else if (entityType === "plan" && targetType === "thought") {
        await links.linkThoughtToPlan.mutateAsync(item._id);
      }
      setOpen(false);
    } catch (err) {
      setError(err.message || "Failed to link");
    }
  };

  const optionList =
    targetType === "task"
      ? optionsQuery.data?.tasks
      : targetType === "thought"
        ? optionsQuery.data?.thoughts
        : optionsQuery.data?.plans;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Relationships</h2>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
        >
          Link entity
        </Button>
      </div>

      {entityType !== "thought" ? (
        <LinkList
          title="Linked thoughts"
          items={linkedThoughts}
          hrefPrefix="/thoughts"
          onUnlink={(id) => {
            if (entityType === "task") {
              links.unlinkThoughtFromTask.mutate(id);
            } else {
              links.unlinkThoughtFromPlan.mutate(id);
            }
          }}
        />
      ) : null}

      {entityType !== "plan" ? (
        <LinkList
          title="Linked plans"
          items={linkedPlans}
          hrefPrefix="/plans"
          onUnlink={(id) => {
            if (entityType === "task") {
              links.unlinkPlanFromTask.mutate(id);
            } else {
              links.unlinkPlanFromThought.mutate(id);
            }
          }}
        />
      ) : null}

      {entityType !== "task" ? (
        <LinkList
          title="Linked tasks"
          items={linkedTasks}
          hrefPrefix="/tasks"
          onUnlink={(id) => {
            if (entityType === "thought") {
              links.unlinkTaskFromThought.mutate(id);
            } else {
              links.unlinkTaskFromPlan.mutate(id);
            }
          }}
          showStatus
        />
      ) : null}

      <Modal open={open} title="Link an entity" onClose={() => setOpen(false)}>
        {error ? (
          <div className="mb-3">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : null}
        <div className="space-y-3">
          <label className="block space-y-1 text-sm font-medium">
            Entity type
            <Select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              {entityType === "task" ? (
                <>
                  <option value="thought">Thought</option>
                  <option value="plan">Plan</option>
                </>
              ) : null}
              {entityType === "thought" ? (
                <>
                  <option value="task">Task</option>
                  <option value="plan">Plan</option>
                </>
              ) : null}
              {entityType === "plan" ? (
                <>
                  <option value="task">Task</option>
                  <option value="thought">Thought</option>
                </>
              ) : null}
            </Select>
          </label>
          <Input
            placeholder="Search by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {(optionList || []).map((item) => (
              <li
                key={item._id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>{item.title}</span>
                <Button variant="secondary" onClick={() => linkItem(item)}>
                  Link
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

function LinkList({ title, items, hrefPrefix, onUnlink, showStatus }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {!items.length ? (
        <p className="mt-2 text-sm text-muted-foreground">None linked</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={item._id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <Link href={`${hrefPrefix}/${item._id}`} className="hover:underline">
                {item.title}
                {showStatus ? ` · ${item.status}` : ""}
              </Link>
              <Button variant="ghost" onClick={() => onUnlink(item._id)}>
                Unlink
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
