"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { useCategories } from "@/hooks/use-categories";
import { useTasks } from "@/hooks/use-tasks";
import { useDebounce } from "@/hooks/use-debounce";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";
import Badge from "@/components/ui/badge";
import { priorityBadgeClass, statusBadgeClass } from "@/lib/task-badges";

function FilterField({ children }) {
  return <div className="relative min-w-0 focus-within:z-50">{children}</div>;
}

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);
  const categoriesQuery = useCategories();

  const filters = useMemo(
    () => ({
      page: String(page),
      limit: "20",
      search: debouncedSearch || undefined,
      status: status || undefined,
      priority: priority || undefined,
      category: category || undefined,
      taskDate: taskDate || undefined,
      sortBy,
      sortOrder,
    }),
    [page, debouncedSearch, status, priority, category, taskDate, sortBy, sortOrder],
  );

  const tasksQuery = useTasks(filters);

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-lead">Manage and filter your tasks</p>
        </div>
        <Link href="/tasks/new">
          <Button>Create task</Button>
        </Link>
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel-header">Filters</div>
        <div className="dashboard-panel-body grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <FilterField>
            <Input
              placeholder="Search title or description"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </FilterField>
          <FilterField>
            <Select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All statuses</option>
              {TASK_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField>
            <Select
              value={priority}
              onChange={(e) => {
                setPage(1);
                setPriority(e.target.value);
              }}
            >
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField>
            <Select
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
            >
              <option value="">All categories</option>
              {(categoriesQuery.data?.items || []).map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField>
            <Input
              type="date"
              value={taskDate}
              onChange={(e) => {
                setPage(1);
                setTaskDate(e.target.value);
              }}
            />
          </FilterField>
          <FilterField>
            <Select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split(":");
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <option value="updatedAt:desc">Updated (newest)</option>
              <option value="updatedAt:asc">Updated (oldest)</option>
              <option value="createdAt:desc">Created (newest)</option>
              <option value="taskDate:asc">Task date (soonest)</option>
              <option value="priority:desc">Priority</option>
              <option value="title:asc">Title (A–Z)</option>
            </Select>
          </FilterField>
        </div>
      </div>

      {tasksQuery.isLoading ? <Spinner label="Loading tasks…" /> : null}
      {tasksQuery.isError ? (
        <EmptyState
          title="Failed to load tasks"
          description={tasksQuery.error.message}
        />
      ) : null}

      {tasksQuery.data?.items?.length ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Task date</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tasksQuery.data.items.map((task) => (
                <tr key={task._id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      href={`/tasks/${task._id}`}
                      className="font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={statusBadgeClass(task.status)}>
                      {task.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={priorityBadgeClass(task.priority)}>
                      {task.priority}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{task.category?.name || "—"}</td>
                  <td className="px-3 py-2">{formatDate(task.taskDate)}</td>
                  <td className="px-3 py-2">{formatDateTime(task.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!tasksQuery.isLoading && !tasksQuery.data?.items?.length ? (
        <EmptyState
          title="No tasks found"
          description="Create a task or adjust your filters."
          action={
            <Link href="/tasks/new">
              <Button>Create task</Button>
            </Link>
          }
        />
      ) : null}

      {tasksQuery.data?.pagination ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {tasksQuery.data.pagination.page} of{" "}
            {tasksQuery.data.pagination.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= (tasksQuery.data.pagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
