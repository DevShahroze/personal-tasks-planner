import FieldInfoPopover from "@/components/ui/field-info-popover";

export default function FieldLabel({ label, htmlFor, required, info, infoLabel }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      <label htmlFor={htmlFor} className="cursor-pointer">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {info ? (
        <FieldInfoPopover label={infoLabel || `About ${label}`}>
          {info}
        </FieldInfoPopover>
      ) : null}
    </span>
  );
}
