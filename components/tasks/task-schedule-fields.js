"use client";

import { useMemo } from "react";
import {
  formStateFromSchedule,
  formatScheduleInstant,
  scheduleFromFormState,
} from "@/lib/scheduling/client-form";
import { useAvailabilityTemplates } from "@/hooks/use-availability-templates";
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
  scheduleState,
  setScheduleState,
  conflicts,
}) {
  const templatesQuery = useAvailabilityTemplates();

  const templates = templatesQuery.data?.items || [];
  const visitEnabled = scheduleState.visitAvailabilityEnabled;
  const conflictList = useMemo(() => conflicts || [], [conflicts]);
  const timeSlots = scheduleState.timeSlots || [];
  const hasCustomSlots = timeSlots.length > 0;

  const applyTemplate = (templateId) => {
    const template = templates.find((item) => String(item._id) === templateId);
    setScheduleState((prev) => {
      const next = {
        ...prev,
        availabilityTemplateId: templateId,
        visitAvailabilityEnabled: true,
        timeSlots: [],
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

  const updateTimeSlot = (index, field, value) => {
    setScheduleState((prev) => {
      const slots = [...(prev.timeSlots || [])];
      slots[index] = { ...slots[index], [field]: value };
      return { ...prev, timeSlots: slots };
    });
  };

  const addTimeSlot = () => {
    setScheduleState((prev) => ({
      ...prev,
      timeSlots: [...(prev.timeSlots || []), { startTime: "", endTime: "" }],
    }));
  };

  const removeTimeSlot = (index) => {
    setScheduleState((prev) => ({
      ...prev,
      timeSlots: (prev.timeSlots || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={visitEnabled}
          onChange={(event) => {
            setScheduleState((prev) => ({
              ...prev,
              visitAvailabilityEnabled: event.target.checked,
            }));
          }}
        />
        <span>
          <span className="font-medium">Enable for this task</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Choose which weekdays and times you can visit or work on this task.
          </span>
        </span>
      </label>

      {visitEnabled ? (
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
                disabled={hasCustomSlots}
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
                disabled={hasCustomSlots}
                onChange={(event) =>
                  setScheduleState((prev) => ({ ...prev, endTime: event.target.value }))
                }
              />
            </label>
          </div>
          {hasCustomSlots ? (
            <p className="text-xs text-muted-foreground">
              Allowed from/until are disabled while custom time slots are set. Remove
              all slots to use a single daily window instead.
            </p>
          ) : null}

          <fieldset className="space-y-2 text-sm">
            <legend className="text-sm">Time slots</legend>
            <p className="text-xs text-muted-foreground">
              Add one or more windows when this task can be done (on the allowed
              weekdays).
            </p>
            {timeSlots.length ? (
              <ul className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <li
                    key={`slot-${index}`}
                    className="flex flex-wrap items-end gap-2 rounded border border-border p-2"
                  >
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">From</span>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) =>
                          updateTimeSlot(index, "startTime", event.target.value)
                        }
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">Until</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) =>
                          updateTimeSlot(index, "endTime", event.target.value)
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => removeTimeSlot(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button type="button" variant="secondary" onClick={addTimeSlot}>
              Add time slot
            </Button>
          </fieldset>

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
