import { normalizeRecurrence } from "./defaults.js";
import { dateToYmd } from "./calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";

export function formStateFromRecurrence(raw, timeZone = DEFAULT_SCHEDULE_TIMEZONE) {
  const recurrence = normalizeRecurrence(raw);
  return {
    enabled: recurrence.enabled,
    interval: String(recurrence.interval),
    unit: recurrence.unit,
    lastCompletedDate: dateToYmd(recurrence.lastCompletedDate, timeZone) || "",
    lastProcedureDate: dateToYmd(recurrence.lastProcedureDate, timeZone) || "",
    endDate: dateToYmd(recurrence.endDate, timeZone) || "",
    procedureStatus: recurrence.procedureStatus,
    procedureDetails: recurrence.procedureDetails || "",
    nextAppointmentDate: dateToYmd(recurrence.nextAppointmentDate, timeZone) || "",
  };
}

export function recurrenceFromFormState(state) {
  return {
    enabled: Boolean(state.enabled),
    interval: Number(state.interval) || 1,
    unit: state.unit,
    lastCompletedDate: state.lastCompletedDate || null,
    lastProcedureDate: state.lastProcedureDate || null,
    endDate: state.endDate || null,
    procedureStatus: state.procedureStatus,
    procedureDetails: state.procedureDetails || "",
    nextAppointmentDate:
      state.procedureStatus === "decided" ? state.nextAppointmentDate || null : null,
  };
}
