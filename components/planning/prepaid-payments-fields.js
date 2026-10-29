import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import FieldLabel from "@/components/ui/field-label";
import FieldInfoPopover from "@/components/ui/field-info-popover";

export default function PrepaidPaymentsFields({
  periodAmountLabel = "each period’s amount",
  max = 120,
  variableAmounts = false,
}) {
  return (
    <fieldset className="space-y-3 rounded-md border border-border p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-medium text-foreground">
        Already paid (optional)
        <FieldInfoPopover label="About already paid installments">
          Add payment history in bulk when you are catching up. Records are created from
          the start date forward, one period at a time, using {periodAmountLabel}.
        </FieldInfoPopover>
      </legend>

      {variableAmounts ? (
        <div className="space-y-1">
          <FieldLabel
            htmlFor="prepaid-payment-amounts"
            label="Variable amounts (one per line)"
            info={
              <>
                Enter one amount per billing period, in order from the start date. Use
                when installments are not all the same size.
              </>
            }
          />
          <Textarea
            id="prepaid-payment-amounts"
            name="prepaidPaymentAmounts"
            rows={4}
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <FieldLabel
          htmlFor="prepaid-payments-count"
          label="Same amount each period — count already paid"
          info={`Number of consecutive periods already paid from the start date, each for ${periodAmountLabel}. Ignored if you filled variable amounts above (those take precedence).`}
        />
        <Input
          id="prepaid-payments-count"
          name="prepaidPaymentsCount"
          type="number"
          min="0"
          max={String(max)}
          step="1"
        />
      </div>
    </fieldset>
  );
}
