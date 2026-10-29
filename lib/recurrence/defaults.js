import { RECURRENCE_UNITS, PROCEDURE_STATUSES } from "./constants.js";

export function defaultRecurrence() {
  return {
    enabled: false,
    interval: 1,
    unit: "months",
    lastCompletedDate: null,
    nextDueDate: null,
    endDate: null,
    lastProcedureDate: null,
    procedureStatus: "undecided",
    procedureDetails: "",
    nextAppointmentDate: null,
  };
}

export function normalizeRecurrence(raw) {
  const base = defaultRecurrence();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  return {
    enabled: Boolean(raw.enabled),
    interval:
      Number(raw.interval) > 0 ? Math.floor(Number(raw.interval)) : base.interval,
    unit: RECURRENCE_UNITS.includes(raw.unit) ? raw.unit : base.unit,
    lastCompletedDate: raw.lastCompletedDate ? new Date(raw.lastCompletedDate) : null,
    nextDueDate: raw.nextDueDate ? new Date(raw.nextDueDate) : null,
    endDate: raw.endDate ? new Date(raw.endDate) : null,
    lastProcedureDate: raw.lastProcedureDate ? new Date(raw.lastProcedureDate) : null,
    procedureStatus: PROCEDURE_STATUSES.includes(raw.procedureStatus)
      ? raw.procedureStatus
      : base.procedureStatus,
    procedureDetails:
      typeof raw.procedureDetails === "string"
        ? raw.procedureDetails
        : base.procedureDetails,
    nextAppointmentDate: raw.nextAppointmentDate
      ? new Date(raw.nextAppointmentDate)
      : null,
  };
}
