"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useDashboardCharts,
  useDashboardListings,
  useDashboardSummary,
} from "@/hooks/use-dashboard";
import Spinner from "@/components/ui/spinner";
import EmptyState from "@/components/ui/empty-state";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { formatDate, formatDateTime } from "@/lib/format";
import DashboardTaskCalendar from "@/components/dashboard/dashboard-task-calendar";
import ErrorBoundary from "@/components/error-boundary";

function SummaryCard({ label, value }) {
  return (
    <div className="dashboard-stat-card">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value ?? 0}</p>
    </div>
  );
}

function ChartCard({ title, children, empty, emptyDescription }) {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">{title}</div>
      <div className="dashboard-panel-body">
        {empty ? (
          <EmptyState
            title="No data yet"
            description={
              emptyDescription || "Create tasks to populate this chart."
            }
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const summary = useDashboardSummary();
  const charts = useDashboardCharts();
  const listings = useDashboardListings();
  const chartTheme = useChartTheme();
  const loading = summary.isLoading || charts.isLoading || listings.isLoading;

  if (loading) {
    return <Spinner label="Loading dashboard…" />;
  }

  if (summary.isError && !summary.data) {
    return (
      <EmptyState
        title="Unable to load dashboard"
        description="Check your database connection and try again."
      />
    );
  }

  const s = summary.data || {};
  const c = charts.data || {
    tasksByStatus: [],
    tasksByPriority: [],
    tasksByCategory: [],
    taskActivity: { created: [], completed: [] },
  };
  const l = listings.data || {
    recentTasks: [],
    upcomingTasks: [],
    urgentTasks: [],
    recentThoughts: [],
    recentPlans: [],
  };

  const activityData = [
    ...(c.taskActivity?.created || []).map((item) => ({
      date: item.date,
      created: item.count,
      completed: 0,
    })),
  ];

  for (const item of c.taskActivity?.completed || []) {
    const existing = activityData.find((row) => row.date === item.date);
    if (existing) {
      existing.completed = item.count;
    } else {
      activityData.push({
        date: item.date,
        created: 0,
        completed: item.count,
      });
    }
  }

  activityData.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-lead">Overview of tasks, thoughts, and plans</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
        <SummaryCard label="Total tasks" value={s.totalTasks} />
        <SummaryCard label="To do" value={s.tasksToDo} />
        <SummaryCard label="In progress" value={s.tasksInProgress} />
        <SummaryCard label="Completed" value={s.completedTasks} />
        <SummaryCard label="High / urgent open" value={s.highPriorityTasks} />
        <SummaryCard label="Thoughts" value={s.totalThoughts} />
        <SummaryCard label="Plans" value={s.totalPlans} />
        <SummaryCard label="Active plans" value={s.activePlans} />
        <SummaryCard label="Active installments" value={s.activeInstallments} />
        <SummaryCard label="Overdue installments" value={s.overdueInstallments} />
        <SummaryCard label="Active subscriptions" value={s.activeSubscriptions} />
        <SummaryCard label="Open applications" value={s.openApplications} />
        <SummaryCard label="Upcoming tours" value={s.upcomingTours} />
      </div>

      <ErrorBoundary
        title="Task calendar unavailable"
        description="The calendar could not be displayed. Charts and lists below may still work."
      >
        <DashboardTaskCalendar />
      </ErrorBoundary>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Tasks by status"
          empty={charts.isError || !c.tasksByStatus?.length}
          emptyDescription={
            charts.isError ? "Chart data could not be loaded." : undefined
          }
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.tasksByStatus}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="count" fill={chartTheme.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Tasks by priority"
          empty={charts.isError || !c.tasksByPriority?.length}
          emptyDescription={
            charts.isError ? "Chart data could not be loaded." : undefined
          }
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.tasksByPriority}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="count" fill={chartTheme.text} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Tasks by category"
          empty={charts.isError || !c.tasksByCategory?.length}
          emptyDescription={
            charts.isError ? "Chart data could not be loaded." : undefined
          }
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.tasksByCategory}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill={chartTheme.primary}
                  fillOpacity={0.75}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Task activity"
          empty={charts.isError || !activityData.length}
          emptyDescription={
            charts.isError ? "Chart data could not be loaded." : undefined
          }
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <Legend wrapperStyle={{ color: chartTheme.text }} />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke={chartTheme.primary}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke={chartTheme.success}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListPanel
          title="Recently updated tasks"
          items={l.recentTasks}
          type="task"
          loadFailed={listings.isError}
        />
        <ListPanel
          title="Upcoming tasks"
          items={l.upcomingTasks}
          type="task"
          loadFailed={listings.isError}
        />
        <ListPanel
          title="High priority open tasks"
          items={l.urgentTasks}
          type="task"
          loadFailed={listings.isError}
        />
        <ListPanel
          title="Recent thoughts"
          items={l.recentThoughts}
          type="thought"
          loadFailed={listings.isError}
        />
        <ListPanel
          title="Recent plans"
          items={l.recentPlans}
          type="plan"
          loadFailed={listings.isError}
        />
      </div>
    </div>
  );
}

function ListPanel({ title, items, type, loadFailed }) {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">{title}</div>
      <div className="dashboard-panel-body">
        {loadFailed ? (
          <p className="text-xs text-muted-foreground">List data could not be loaded.</p>
        ) : !items?.length ? (
          <p className="text-xs text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item._id} className="py-2 text-xs first:pt-0 last:pb-0">
                <Link
                  className="font-medium text-foreground hover:underline"
                  href={`/${type}s/${item._id}`}
                >
                  {item.title}
                </Link>
                <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                  {type === "task"
                    ? `${item.status} · ${item.priority} · ${formatDate(item.taskDate)}`
                    : formatDateTime(item.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
