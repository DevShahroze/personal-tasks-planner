export default function StartPausedField({ idPrefix = "planning" }) {
  return (
    <label
      className="flex items-start gap-2 text-sm"
      htmlFor={`${idPrefix}-start-paused`}
    >
      <input
        id={`${idPrefix}-start-paused`}
        type="checkbox"
        name="startPaused"
        className="mt-0.5 rounded border-border"
      />
      <span>
        <span className="font-medium">Start paused</span>
        <span className="block text-xs text-muted-foreground">
          No calendar reminders until you resume from the detail page.
        </span>
      </span>
    </label>
  );
}

export function startPausedFromFormData(formData) {
  return formData.get("startPaused") === "on";
}
