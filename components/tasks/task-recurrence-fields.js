"use client";

import { useMemo, useState } from "react";
import { RECURRENCE_UNITS, PROCEDURE_STATUSES } from "@/lib/recurrence/constants";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import {
  formStateFromRecurrence,
  recurrenceFromFormState,
} from "@/lib/recurrence/client-form";
import { useTaskCalendar } from "@/hooks/use-task-calendar";
import { useClientTodayYmd } from "@/hooks/use-client-today";
import TaskMonthCalendar from "@/components/calendar/task-month-calendar";
import { validateYmdAgainstSchedule } from "@/lib/calendar/schedule-date-check";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import Button from "@/components/ui/button";
import Alert from "@/components/ui/alert";

export function buildInitialRecurrenceState(initialValues, timeZone) {
  return formStateFromRecurrence(initialValues?.recurrence, timeZone);
}

export default function TaskFormCalendarPicker({
  selectedYmd,
  onSelectYmd,
  scheduleForValidation,
  timeZone = DEFAULT_SCHEDULE_TIMEZONE,
}) {
  const clientToday = useClientTodayYmd();
  const [view, setView] = useState(null);

  const initialYmd = selectedYmd || clientToday?.ymd || "";
  const activeView =
    view ||
    (initialYmd && /^\d{4}-\d{2}-\d{2}$/.test(initialYmd)
      ? {
          year: Number(initialYmd.slice(0, 4)),
          month: Number(initialYmd.slice(5, 7)),
        }
      : clientToday
        ? { year: clientToday.year, month: clientToday.month }
        : null);

  const calendarQuery = useTaskCalendar(
    activeView?.year,
    activeView?.month,
    timeZone,
    Boolean(clientToday && activeView),
  );

  const restrictionByYmd = useMemo(() => {
    if (!scheduleForValidation) {
      return {};
    }
    const map = {};
    for (const ymd of Object.keys(calendarQuery.data?.days || {})) {
      const result = validateYmdAgainstSchedule(ymd, scheduleForValidation);
      if (!result.ok) {
        map[ymd] = result.message;
      }
    }
    if (selectedYmd) {
      const selectedCheck = validateYmdAgainstSchedule(
        selectedYmd,
        scheduleForValidation,
      );
      if (!selectedCheck.ok) {
        map[selectedYmd] = selectedCheck.message;
      }
    }
    return map;
  }, [calendarQuery.data?.days, scheduleForValidation, selectedYmd]);

  if (!clientToday || !activeView) {
    return (
      <div className="h-56 rounded-md border border-border bg-muted/30" aria-hidden />
    );
  }

  return (
    <TaskMonthCalendar
      compact
      year={activeView.year}
      month={activeView.month}
      onMonthChange={setView}
      selectedYmd={selectedYmd}
      onSelectYmd={(ymd) => {
        const check = validateYmdAgainstSchedule(ymd, scheduleForValidation);
        if (!check.ok) {
          onSelectYmd(ymd, check.message);
          return;
        }
        onSelectYmd(ymd, null);
      }}
      dayEntries={calendarQuery.data?.days || {}}
      todayYmd={clientToday.ymd}
      restrictionByYmd={restrictionByYmd}
      ariaLabel="Task date calendar"
    />
  );
}

export function TaskRecurrenceFields({
  recurrenceState,
  setRecurrenceState,
  timeZone,
  taskId,
  suggestedStartYmd,
  onRecordCompletion,
  recording,
  nextDuePreview,
  needsStartingDate,
}) {
  const toggleRecurring = (enabled) => {
    setRecurrenceState((prev) => {
      if (!enabled) {
        return { ...prev, enabled: false };
      }
      const next = { ...prev, enabled: true };
      if (suggestedStartYmd && !next.lastProcedureDate && !next.lastCompletedDate) {
        next.lastProcedureDate = suggestedStartYmd;
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold tracking-tight">Recurrence & procedures</p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={recurrenceState.enabled}
          onChange={(event) => toggleRecurring(event.target.checked)}
        />
        Recurring task
      </label>

      {!recurrenceState.enabled ? (
        <p className="text-xs text-muted-foreground">
          Turn this on to repeat on a schedule, or save with this off to stop an
          existing recurring task.
        </p>
      ) : null}

      {recurrenceState.enabled ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Every</span>
              <Input
                type="number"
                min="1"
                step="1"
                value={recurrenceState.interval}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({
                    ...prev,
                    interval: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Unit</span>
              <Select
                value={recurrenceState.unit}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({ ...prev, unit: event.target.value }))
                }
              >
                {RECURRENCE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Last completed</span>
              <Input
                type="date"
                value={recurrenceState.lastCompletedDate}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({
                    ...prev,
                    lastCompletedDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Last procedure / visit</span>
              <Input
                type="date"
                value={recurrenceState.lastProcedureDate}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({
                    ...prev,
                    lastProcedureDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span>Recurrence end (optional)</span>
              <Input
                type="date"
                value={recurrenceState.endDate}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          {needsStartingDate ? (
            <Alert variant="info">
              Add a last visit or last completed date to calculate the next due date.
            </Alert>
          ) : null}
          {nextDuePreview ? (
            <p className="text-xs text-muted-foreground">
              Next due (calculated): {nextDuePreview}
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Procedure status</span>
              <Select
                value={recurrenceState.procedureStatus}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({
                    ...prev,
                    procedureStatus: event.target.value,
                  }))
                }
              >
                {PROCEDURE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Next appointment (booked)</span>
              <Input
                type="date"
                disabled={recurrenceState.procedureStatus !== "decided"}
                value={recurrenceState.nextAppointmentDate}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({
                    ...prev,
                    nextAppointmentDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span>Procedure details</span>
              <Textarea
                rows={2}
                value={recurrenceState.procedureDetails}
                onChange={(event) =>
                  setRecurrenceState((prev) => ({
                    ...prev,
                    procedureDetails: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          {taskId && onRecordCompletion ? (
            <RecordOccurrenceForm onSubmit={onRecordCompletion} recording={recording} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function RecordOccurrenceForm({ onSubmit, recording }) {
  const [completedDate, setCompletedDate] = useState("");
  const [procedureDate, setProcedureDate] = useState("");

  return (
    <div className="space-y-2 rounded border border-dashed border-border p-2">
      <p className="text-xs font-medium">Record occurrence</p>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block space-y-1 text-xs">
          <span>Completion date</span>
          <Input
            type="date"
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-xs">
          <span>Procedure date (optional)</span>
          <Input
            type="date"
            value={procedureDate}
            onChange={(e) => setProcedureDate(e.target.value)}
          />
        </label>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={recording || !completedDate}
        onClick={() =>
          onSubmit({
            completedDate,
            procedureDate: procedureDate || undefined,
          })
        }
      >
        {recording ? "Saving…" : "Record completion"}
      </Button>
    </div>
  );
}

export { recurrenceFromFormState };
