/** Whether the task shows order / purchase tracking (dates or amounts). */
export function taskTracksOrderPurchase(task) {
  if (!task) {
    return false;
  }
  if (task.orderPlacedDate || task.expectedReceiveDate || task.receivedDate) {
    return true;
  }
  if (task.timelineStart || task.timelineEnd) {
    return true;
  }
  if (task.amountSpent != null && task.amountSpent !== "") {
    return true;
  }
  if (task.intent && task.intent !== "none") {
    return true;
  }
  if (task.estimatedValue != null && task.estimatedValue !== "") {
    return true;
  }
  if (task.actualValue != null && task.actualValue !== "") {
    return true;
  }
  if (task.decisionStatus && task.decisionStatus !== "considering") {
    return true;
  }
  if (task.orderPayments?.length) {
    return true;
  }
  return false;
}
