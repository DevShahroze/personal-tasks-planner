import { connectDB } from "@/lib/mongodb";
import SequenceTimer, { SEQUENCE_TIMER_ID } from "@/models/SequenceTimer";

export function sequenceTimerPublicView(doc) {
  if (!doc) {
    return {
      players: [],
      currentPlayerIndex: 0,
      isRunning: false,
      updatedAt: null,
    };
  }
  return {
    players: (doc.players || []).map((player) => ({
      id: player.id,
      name: player.name,
      elapsedMs: player.elapsedMs ?? 0,
      colorIndex: player.colorIndex ?? 0,
    })),
    currentPlayerIndex: doc.currentPlayerIndex ?? 0,
    isRunning: Boolean(doc.isRunning),
    updatedAt: doc.updatedAt ?? null,
  };
}

export async function loadSequenceTimer() {
  await connectDB();
  let doc = await SequenceTimer.findById(SEQUENCE_TIMER_ID).lean();
  if (!doc) {
    doc = (await SequenceTimer.create({ _id: SEQUENCE_TIMER_ID })).toObject();
  }
  return doc;
}

export async function saveSequenceTimer(payload) {
  await connectDB();
  const updated = await SequenceTimer.findByIdAndUpdate(
    SEQUENCE_TIMER_ID,
    {
      players: payload.players,
      currentPlayerIndex: payload.currentPlayerIndex,
      isRunning: false,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return updated;
}
