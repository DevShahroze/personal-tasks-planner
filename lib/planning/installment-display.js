import { roundMoney, sumPayments } from "../finance/balance.js";

export function installmentIsOpenEnded(doc) {
  return Boolean(doc?.openEnded);
}

export function installmentTotalPaid(doc) {
  return roundMoney(sumPayments(doc.payments));
}
