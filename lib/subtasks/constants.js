export const TOP_LEVEL_PARENT_FILTER = {
  $or: [{ parentTaskId: null }, { parentTaskId: { $exists: false } }],
};

export function mergeWithTopLevelFilter(filter = {}) {
  return { $and: [filter, TOP_LEVEL_PARENT_FILTER] };
}

export function subtaskSummary(subtasks) {
  const items = subtasks || [];
  const total = items.length;
  const completed = items.filter((item) => item.status === "Completed").length;
  return { total, completed };
}

export function formatSubtaskSummary(summary) {
  if (!summary?.total) {
    return "No subtasks";
  }
  return `${summary.completed} of ${summary.total} subtasks completed`;
}
