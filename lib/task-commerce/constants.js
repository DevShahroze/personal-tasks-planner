export const TASK_INTENTS = ["none", "buy", "sell"];
export const TASK_DECISION_STATUSES = ["considering", "decided", "cancelled"];
export const DEFAULT_TASK_CURRENCY = "PKR";

export const TASK_INTENT_LABEL = {
  none: "None",
  buy: "Buy",
  sell: "Sell",
};

export const TASK_DECISION_STATUS_LABEL = {
  considering: "Considering",
  decided: "Decided",
  cancelled: "Cancelled",
};

export function defaultTaskCommerce() {
  return {
    intent: "none",
    decisionStatus: "considering",
    estimatedValue: null,
    actualValue: null,
    currency: DEFAULT_TASK_CURRENCY,
  };
}
