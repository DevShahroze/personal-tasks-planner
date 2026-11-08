export function isDuplicatePayment(payments, candidate) {
  const amount = Number(candidate.amount);
  const paidAt = new Date(candidate.paidAt).getTime();
  return (payments || []).some((payment) => {
    return (
      Number(payment.amount) === amount && new Date(payment.paidAt).getTime() === paidAt
    );
  });
}

export function sortPaymentsByPaidAtAsc(payments) {
  return [...(payments || [])].sort(
    (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime(),
  );
}

export function sortPaymentsByPaidAtInPlace(payments) {
  if (!payments?.length) {
    return payments;
  }
  payments.sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
  return payments;
}
