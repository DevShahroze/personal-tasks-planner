import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

export default function PrepaidPaymentsFields({
  periodAmountLabel = "each period’s amount",
  max = 120,
  variableAmounts = false,
}) {
  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <legend className="px-1 text-xs font-medium">Already paid (optional)</legend>
      <p className="text-xs text-muted-foreground">
        Add one payment record per billing period from the start date (
        {periodAmountLabel}). Use this when you are catching up and do not want to enter
        many rows by hand.
      </p>
      {variableAmounts ? (
        <>
          <Textarea
            name="prepaidPaymentAmounts"
            rows={4}
            placeholder={
              "One amount per line when installments vary\n100\n120\n95\n150"
            }
          />
          <p className="text-xs text-muted-foreground">
            Each line is one period, in order from the start date. You can still use the
            count field below when every installment is the same amount.
          </p>
        </>
      ) : null}
      <Input
        name="prepaidPaymentsCount"
        type="number"
        min="0"
        max={String(max)}
        step="1"
        placeholder="Same amount each period — how many already paid (e.g. 20)"
      />
    </fieldset>
  );
}
