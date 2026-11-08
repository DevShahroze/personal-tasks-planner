import { sequenceTimerApi } from "@/lib/api-client";
import {
  loadSequenceTimerLocal,
  saveSequenceTimerLocal,
} from "@/lib/sequence-timer/storage";

export async function loadSequenceTimerForClient() {
  try {
    return await sequenceTimerApi.get();
  } catch (error) {
    if (error?.status === 401) {
      return loadSequenceTimerLocal();
    }
    throw error;
  }
}

export async function saveSequenceTimerForClient(payload) {
  try {
    return await sequenceTimerApi.save(payload);
  } catch (error) {
    if (error?.status === 401) {
      const saved = saveSequenceTimerLocal(payload);
      if (!saved) {
        throw new Error("Could not save locally");
      }
      return saved;
    }
    throw error;
  }
}
