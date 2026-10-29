"use client";

import { useMemo, useState } from "react";
import { SCHEDULE_MODES, DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import {
  formStateFromSchedule,
  formatScheduleInstant,
  scheduleFromFormState,
} from "@/lib/scheduling/client-form";
import { useAvailabilityTemplates } from "@/hooks/use-availability-templates";
import { tasksApi } from "@/lib/api-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Alert from "@/components/ui/alert";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function buildInitialScheduleState(initialValues) {
  return formStateFromSchedule(initialValues?.schedule);
}

export default function TaskScheduleFields({
  taskId,
  initialValues,
  scheduleState,
  setScheduleState,
  conflicts,
}) {
  const templatesQuery = useAvailabilityTemplates();
  const [slotMessage, setSlotMessage] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotOptions, setSlotOptions] = useState([]);

  const templates = templatesQuery.data?.items || [];
  const showAvailability =
    scheduleState.mode === "flexible" || scheduleState.mode === "fixed";
  const showFixedTimes = scheduleState.mode === "fixed";
  const showFlexibleDates = scheduleState.mode === "flexible";

  const conflictList = useMemo(() => conflicts || [], [conflicts]);

  const applyTemplate = (templateId) => {
    const template = templates.find((item) => String(item._id) === templateId);
    setScheduleState((prev) => {
      const next = {
        ...prev,
        availabilityTemplateId: templateId,
      };
      if (template) {
        next.daysOfWeek = [...template.daysOfWeek];
        next.startTime = template.startTime;
        next.endTime = template.endTime;
        next.timezone = template.timezone;
        next.excludePublicHolidays = Boolean(template.excludePublicHolidays);
      }
      return next;
    });
  };

  const loadSlots = async () => {
    if (!taskId) {
      setSlotMessage("Save the task first to load slot suggestions.");
      return;
    }
    setSlotLoading(true);
    setSlotMessage("");
    try {
      const schedule = scheduleFromFormState(scheduleState);
      const result = await tasksApi.scheduleSlots(taskId, { schedule });
      setSlotOptions(result.slots || []);
      setSlotMessage(result.message || "");
    } catch (err) {
      setSlotOptions([]);
      setSlotMessage(err.message || "Could not load slot suggestions");
    } finally {
      setSlotLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold tracking-tight">Scheduling</p>

      <label className="block space-y-1 text-sm">
        <span>Mode</span>
        <Select
          value={scheduleState.mode}
          onChange={(event) => {
            const mode = event.target.value;
            setScheduleState((prev) => ({ ...prev, mode, selectedSlot: null }));
          }}
        >
          {SCHEDULE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </option>
          ))}
        </Select>
      </label>

      {(showFlexibleDates || showFixedTimes) && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Earliest date</span>
            <Input
              type="date"
              value={scheduleState.earliestDate}
              onChange={(event) =>
                setScheduleState((prev) => ({
                  ...prev,
                  earliestDate: event.target.value,
                }))
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Deadline</span>
            <Input
              type="date"
              value={scheduleState.dueDate}
              onChange={(event) =>
                setScheduleState((prev) => ({ ...prev, dueDate: event.target.value }))
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Duration (minutes)</span>
            <Input
              type="number"
              min="1"
              step="1"
              value={scheduleState.durationMinutes}
              onChange={(event) =>
                setScheduleState((prev) => ({
                  ...prev,
                  durationMinutes: event.target.value,
                }))
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Timezone</span>
            <Input
              value={scheduleState.timezone}
              onChange={(event) =>
                setScheduleState((prev) => ({ ...prev, timezone: event.target.value }))
              }
              placeholder={DEFAULT_SCHEDULE_TIMEZONE}
            />
          </label>
        </div>
      )}

      {showAvailability ? (
        <>
          <label className="block space-y-1 text-sm">
            <span>Availability template</span>
            <Select
              value={scheduleState.availabilityTemplateId}
              onChange={(event) => applyTemplate(event.target.value)}
            >
              <option value="">Custom</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </label>

          <fieldset className="space-y-2 text-sm">
            <legend className="text-sm">Allowed weekdays</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => {
                const checked = scheduleState.daysOfWeek.includes(day.value);
                return (
                  <label key={day.value} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setScheduleState((prev) => {
                          const set = new Set(prev.daysOfWeek);
                          if (event.target.checked) {
                            set.add(day.value);
                          } else {
                            set.delete(day.value);
                          }
                          return {
                            ...prev,
                            daysOfWeek: [...set].sort((a, b) => a - b),
                          };
                        });
                      }}
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Allowed from</span>
              <Input
                type="time"
                value={scheduleState.startTime}
                onChange={(event) =>
                  setScheduleState((prev) => ({
                    ...prev,
                    startTime: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Allowed until</span>
              <Input
                type="time"
                value={scheduleState.endTime}
                onChange={(event) =>
                  setScheduleState((prev) => ({ ...prev, endTime: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scheduleState.excludePublicHolidays}
              onChange={(event) =>
                setScheduleState((prev) => ({
                  ...prev,
                  excludePublicHolidays: event.target.checked,
                }))
              }
            />
            Exclude public holidays
          </label>
        </>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={scheduleState.avoidConflicts}
          onChange={(event) =>
            setScheduleState((prev) => ({
              ...prev,
              avoidConflicts: event.target.checked,
            }))
          }
        />
        Avoid scheduling conflicts
      </label>

      {showFixedTimes ? (
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1 text-sm">
            <span>Scheduled date</span>
            <Input
              type="date"
              value={scheduleState.scheduledDate}
              onChange={(event) =>
                setScheduleState((prev) => ({
                  ...prev,
                  scheduledDate: event.target.value,
                }))
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Start time</span>
            <Input
              type="time"
              value={scheduleState.scheduledStartTime}
              onChange={(event) =>
                setScheduleState((prev) => ({
                  ...prev,
                  scheduledStartTime: event.target.value,
                }))
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>End time</span>
            <Input
              type="time"
              value={scheduleState.scheduledEndTime}
              onChange={(event) =>
                setScheduleState((prev) => ({
                  ...prev,
                  scheduledEndTime: event.target.value,
                }))
              }
            />
          </label>
        </div>
      ) : null}

      {scheduleState.mode === "flexible" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={slotLoading}
              onClick={loadSlots}
            >
              {slotLoading ? "Loading…" : "Suggest time slots"}
            </Button>
            {!taskId ? (
              <p className="text-xs text-muted-foreground">
                Save the task first to fetch suggestions against existing bookings.
              </p>
            ) : null}
          </div>
          {slotMessage ? (
            <p className="text-sm text-muted-foreground">{slotMessage}</p>
          ) : null}
          {slotOptions.length ? (
            <ul className="space-y-2 text-sm">
              {slotOptions.map((slot) => {
                const key = `${slot.scheduledStart}-${slot.scheduledEnd}`;
                const selected =
                  scheduleState.selectedSlot?.scheduledStart === slot.scheduledStart;
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded border border-border px-2 py-1">
                      <input
                        type="radio"
                        name="flex-slot"
                        checked={selected}
                        onChange={() =>
                          setScheduleState((prev) => ({
                            ...prev,
                            selectedSlot: slot,
                          }))
                        }
                      />
                      {formatScheduleInstant(
                        slot.scheduledStart,
                        scheduleState.timezone,
                      )}{" "}
                      –{" "}
                      {formatScheduleInstant(slot.scheduledEnd, scheduleState.timezone)}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {conflictList.length ? (
        <Alert variant="error">
          <p className="font-medium">Scheduling conflict</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {conflictList.map((item) => (
              <li key={item.id}>
                {item.title}:{" "}
                {formatScheduleInstant(item.scheduledStart, scheduleState.timezone)} –{" "}
                {formatScheduleInstant(item.scheduledEnd, scheduleState.timezone)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Choose another time or turn off conflict avoidance for this task.
          </p>
        </Alert>
      ) : null}
    </div>
  );
}

export { scheduleFromFormState };
