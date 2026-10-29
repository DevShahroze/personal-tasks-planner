import mongoose from "mongoose";

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

export function isDuplicatePayment(payments, candidate) {
  const amount = Number(candidate.amount);
  const paidAt = new Date(candidate.paidAt).getTime();
  return (payments || []).some((payment) => {
    return (
      Number(payment.amount) === amount && new Date(payment.paidAt).getTime() === paidAt
    );
  });
}
