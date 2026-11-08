import mongoose from "mongoose";

export {
  isDuplicatePayment,
  sortPaymentsByPaidAtAsc,
  sortPaymentsByPaidAtInPlace,
} from "./sort.js";

export function createPaymentSubschema() {
  return new mongoose.Schema(
    {
      amount: { type: Number, required: true, min: 0.01 },
      paidAt: { type: Date, required: true, default: Date.now },
      note: { type: String, default: "" },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
  );
}
