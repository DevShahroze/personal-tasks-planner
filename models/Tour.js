import mongoose from "mongoose";
import {
  TOUR_BOOKING_STATUSES,
  TOUR_PAYMENT_STATUSES,
  DEFAULT_PLANNING_CURRENCY,
} from "@/lib/planning/constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants";

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    category: { type: String, default: "General", trim: true },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const tourSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    destination: { type: String, default: "", trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    durationDays: { type: Number, default: null },
    estimatedBudget: { type: Number, default: null },
    actualTotalExpenses: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: DEFAULT_PLANNING_CURRENCY },
    expenses: { type: [expenseSchema], default: [] },
    bookingStatus: {
      type: String,
      enum: TOUR_BOOKING_STATUSES,
      default: "planning",
    },
    paymentStatus: {
      type: String,
      enum: TOUR_PAYMENT_STATUSES,
      default: "unpaid",
    },
    accommodation: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    transport: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    notes: { type: String, default: "", maxlength: MAX_DESCRIPTION_LENGTH },
    relatedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  },
  { timestamps: true },
);

tourSchema.index({ updatedAt: -1 });

export default mongoose.models.Tour || mongoose.model("Tour", tourSchema);
