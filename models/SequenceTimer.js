import mongoose from "mongoose";

export const SEQUENCE_TIMER_ID = "singleton";

const sequenceTimerPlayerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    elapsedMs: { type: Number, default: 0, min: 0 },
    colorIndex: { type: Number, required: true, min: 0, max: 5 },
  },
  { _id: false },
);

const sequenceTimerSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SEQUENCE_TIMER_ID },
    players: { type: [sequenceTimerPlayerSchema], default: [] },
    currentPlayerIndex: { type: Number, default: 0, min: 0 },
    isRunning: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.SequenceTimer ||
  mongoose.model("SequenceTimer", sequenceTimerSchema);
