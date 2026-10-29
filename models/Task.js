import mongoose from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { defaultSchedule } from "@/lib/scheduling/defaults";
import { SCHEDULE_MODES, DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import { defaultRecurrence } from "@/lib/recurrence/defaults";
import { RECURRENCE_UNITS, PROCEDURE_STATUSES } from "@/lib/recurrence/constants";
import {
  TASK_DECISION_STATUSES,
  TASK_INTENTS,
  DEFAULT_TASK_CURRENCY,
} from "@/lib/task-commerce/constants";

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: "" },
  },
  { _id: false },
);

const columnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: "" },
  },
  { _id: false },
);

const cellSchema = new mongoose.Schema(
  {
    columnId: { type: String, required: true },
    value: { type: String, default: "" },
  },
  { _id: false },
);

const rowSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    cells: [cellSchema],
  },
  { _id: false },
);

const contentBlockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["checkbox", "radioGroup", "table"],
      required: true,
    },
    label: { type: String, default: "" },
    slug: { type: String, default: "" },
    checked: { type: Boolean, default: false },
    groupLabel: { type: String, default: "" },
    options: [optionSchema],
    selectedOptionId: { type: String, default: null },
    columns: [columnSchema],
    rows: [rowSchema],
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    contentBlocks: { type: [contentBlockSchema], default: [] },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: "To Do",
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "Medium",
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    taskDate: { type: Date, default: null, index: true },
    timelineStart: { type: Date, default: null },
    timelineEnd: { type: Date, default: null },
    schedule: {
      mode: {
        type: String,
        enum: SCHEDULE_MODES,
        default: "unscheduled",
      },
      earliestDate: { type: Date, default: null },
      dueDate: { type: Date, default: null },
      scheduledStart: { type: Date, default: null, index: true },
      scheduledEnd: { type: Date, default: null, index: true },
      durationMinutes: { type: Number, default: null },
      timezone: { type: String, default: DEFAULT_SCHEDULE_TIMEZONE },
      availabilityTemplateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AvailabilityTemplate",
        default: null,
      },
      availability: {
        daysOfWeek: { type: [Number], default: () => [1, 2, 3, 4, 5, 6, 7] },
        startTime: { type: String, default: "00:00" },
        endTime: { type: String, default: "23:59" },
        excludePublicHolidays: { type: Boolean, default: false },
      },
      avoidConflicts: { type: Boolean, default: true },
    },
    recurrence: {
      enabled: { type: Boolean, default: false },
      interval: { type: Number, default: 1 },
      unit: { type: String, enum: RECURRENCE_UNITS, default: "months" },
      lastCompletedDate: { type: Date, default: null },
      nextDueDate: { type: Date, default: null, index: true },
      endDate: { type: Date, default: null },
      lastProcedureDate: { type: Date, default: null },
      procedureStatus: {
        type: String,
        enum: PROCEDURE_STATUSES,
        default: "undecided",
      },
      procedureDetails: { type: String, default: "" },
      nextAppointmentDate: { type: Date, default: null },
    },
    linkedThoughts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Thought" }],
    linkedPlans: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }],
    parentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    intent: {
      type: String,
      enum: TASK_INTENTS,
      default: "none",
    },
    decisionStatus: {
      type: String,
      enum: TASK_DECISION_STATUSES,
      default: "considering",
    },
    estimatedValue: { type: Number, default: null },
    actualValue: { type: Number, default: null },
    amountSpent: { type: Number, default: null },
    currency: { type: String, default: DEFAULT_TASK_CURRENCY },
  },
  { timestamps: true },
);

taskSchema.index({ title: "text", description: "text" });
taskSchema.index({ updatedAt: -1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({
  status: 1,
  "schedule.scheduledStart": 1,
  "schedule.scheduledEnd": 1,
});
taskSchema.index({ parentTaskId: 1, status: 1 });

taskSchema.pre("save", function ensureScheduleDefaults() {
  if (!this.schedule) {
    this.schedule = defaultSchedule();
  }
  if (!this.recurrence) {
    this.recurrence = defaultRecurrence();
  }
});

if (mongoose.models.Task) {
  delete mongoose.models.Task;
}

export default mongoose.model("Task", taskSchema);
