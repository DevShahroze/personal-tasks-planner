import { PAYMENT_FREQUENCIES } from "../schedules/frequency.js";
import {
  INSTALLMENT_STATUSES,
  INSURANCE_POLICY_STATUSES,
  KAMETI_STATUSES,
  SUBSCRIPTION_STATUSES,
  APPLICATION_STATUSES,
  FEE_PAYMENT_STATUSES,
  TOUR_BOOKING_STATUSES,
  TOUR_PAYMENT_STATUSES,
  DEFAULT_PLANNING_CURRENCY,
  INSTALLMENT_LOG_PAYMENT_KINDS,
} from "./constants.js";
import { MAX_DESCRIPTION_LENGTH } from "../security/constants.js";
import { isValidObjectId } from "../security/ids.js";
import { roundMoney } from "../finance/balance.js";
import {
  parseMoneyInput,
  parseOptionalPositiveInt,
  parseCustomIntervalDays,
  assertDateOnOrAfter,
} from "./money-fields.js";
import {
  buildDownPaymentRecord,
  buildPrepaidPaymentRecords,
  buildVariablePrepaidPaymentRecords,
  parsePrepaidPaymentsCount,
  parsePrepaidPaymentAmounts,
  sumPrepaidAmount,
  nextDueDateAfterPrepaid,
} from "./prepaid-payments.js";
import { addIntervalToYmd, dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { installmentPaymentNoteForKind } from "./installment-payments.js";

const MAX_NAME = 200;

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function parseMoney(value, label, errors, options = {}) {
  return parseMoneyInput(value, label, errors, options);
}

function parseDate(value, label, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      errors.push(`${label} is required`);
    }
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`Invalid ${label}`);
    return null;
  }
  return date;
}

function parseFrequency(value, errors) {
  if (!PAYMENT_FREQUENCIES.includes(value)) {
    errors.push("Invalid payment frequency");
    return "monthly";
  }
  return value;
}

function parseTaskId(value, errors) {
  if (!value) {
    return null;
  }
  if (!isValidObjectId(String(value))) {
    errors.push("Invalid linked task");
    return null;
  }
  return value;
}

export function validateInstallmentCreate(body) {
  const errors = [];
  const name = limitString(body.name, MAX_NAME);
  if (!name) {
    errors.push("Name is required");
  }
  const totalAmount = parseMoney(body.totalAmount, "total amount", errors, {
    required: true,
  });
  const installmentAmount = parseMoney(
    body.installmentAmount,
    "installment amount",
    errors,
  );
  const startDate = parseDate(body.startDate, "start date", errors, { required: true });
  const endDate = parseDate(body.endDate, "end date", errors);
  assertDateOnOrAfter(startDate, endDate, "End date", errors);
  const frequency = parseFrequency(body.frequency || "monthly", errors);
  const customIntervalDays = parseCustomIntervalDays(
    frequency,
    body.customIntervalDays,
    errors,
  );
  const totalInstallments = parseOptionalPositiveInt(
    body.totalInstallments,
    "Total installments",
    errors,
  );

  if (installmentAmount && totalAmount && installmentAmount > totalAmount) {
    errors.push("Typical installment cannot exceed total amount");
  }

  const downPaymentAmount = parseMoney(
    body.downPaymentAmount,
    "down payment amount",
    errors,
  );
  let downPaymentDate = null;
  if (downPaymentAmount) {
    if (totalAmount && downPaymentAmount > totalAmount) {
      errors.push("Down payment cannot exceed total amount");
    }
    if (
      body.downPaymentDate !== undefined &&
      body.downPaymentDate !== null &&
      body.downPaymentDate !== ""
    ) {
      downPaymentDate = parseDate(body.downPaymentDate, "down payment date", errors, {
        required: true,
      });
    } else if (startDate) {
      downPaymentDate = startDate;
    } else {
      errors.push("Down payment date is required when start date is missing");
    }
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  const prepaidCount = parsePrepaidPaymentsCount(body.prepaidPaymentsCount, errors);
  const prepaidAmounts = parsePrepaidPaymentAmounts(body.prepaidPaymentAmounts, errors);

  let payments = [];
  if (prepaidAmounts?.length) {
    payments = buildVariablePrepaidPaymentRecords({
      amounts: prepaidAmounts,
      startDate,
      frequency,
      customIntervalDays,
      notePrefix: "Installment paid",
    });
    if (payments.length < prepaidAmounts.length) {
      errors.push("Could not generate all prepaid payment dates for this frequency");
    }
  } else if (prepaidCount > 0) {
    if (!installmentAmount) {
      errors.push(
        "Enter a typical installment amount, or list each already-paid amount (one per line)",
      );
    } else {
      payments = buildPrepaidPaymentRecords({
        count: prepaidCount,
        amountPerPayment: installmentAmount,
        startDate,
        frequency,
        customIntervalDays,
        notePrefix: "Installment paid",
      });
      if (payments.length < prepaidCount) {
        errors.push("Could not generate all prepaid payment dates for this frequency");
      }
    }
  }
  if (downPaymentAmount && downPaymentDate) {
    const downRecord = buildDownPaymentRecord({
      amount: downPaymentAmount,
      paidAt: downPaymentDate,
    });
    if (!downRecord) {
      errors.push("Invalid down payment date");
    } else {
      payments.unshift(downRecord);
    }
  }
  const prepaidTotal = sumPrepaidAmount(payments);
  if (prepaidTotal > totalAmount) {
    errors.push("Already-paid total exceeds total commitment amount");
  }
  for (const payment of payments) {
    if (payment.amount > totalAmount) {
      errors.push("Each already-paid amount cannot exceed the total commitment");
      break;
    }
  }
  const prepaidPeriods = payments.length;
  if (totalInstallments && prepaidPeriods > totalInstallments) {
    errors.push("Already-paid periods exceed total installments");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: [],
    value: {
      name,
      description: limitString(body.description, MAX_DESCRIPTION_LENGTH),
      totalAmount,
      downPaymentAmount: downPaymentAmount || null,
      downPaymentDate: downPaymentAmount ? downPaymentDate : null,
      installmentAmount,
      currency: limitString(body.currency, 8) || DEFAULT_PLANNING_CURRENCY,
      frequency,
      customIntervalDays,
      startDate,
      endDate,
      totalInstallments,
      outstandingBalance: totalAmount,
      installmentsPaid: 0,
      status: "active",
      payments,
      taskId: parseTaskId(body.taskId, errors),
    },
  };
}

export function validateInstallmentUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.name !== undefined) {
    const name = limitString(body.name, MAX_NAME);
    if (!name) {
      errors.push("Name cannot be empty");
    } else {
      patch.name = name;
    }
  }
  if (body.description !== undefined) {
    patch.description = limitString(body.description, MAX_DESCRIPTION_LENGTH);
  }
  if (body.totalAmount !== undefined) {
    patch.totalAmount = parseMoney(body.totalAmount, "total amount", errors, {
      required: true,
    });
  }
  if (body.installmentAmount !== undefined) {
    if (body.installmentAmount === null || body.installmentAmount === "") {
      patch.installmentAmount = null;
    } else {
      patch.installmentAmount = parseMoney(
        body.installmentAmount,
        "installment amount",
        errors,
      );
    }
  }
  if (body.frequency !== undefined) {
    patch.frequency = parseFrequency(body.frequency, errors);
  }
  if (body.customIntervalDays !== undefined || body.frequency !== undefined) {
    const frequency = patch.frequency || body.frequency || "monthly";
    patch.customIntervalDays = parseCustomIntervalDays(
      frequency,
      body.customIntervalDays,
      errors,
    );
  }
  if (body.startDate !== undefined) {
    patch.startDate = parseDate(body.startDate, "start date", errors, {
      required: true,
    });
  }
  if (body.endDate !== undefined) {
    patch.endDate = body.endDate ? parseDate(body.endDate, "end date", errors) : null;
  }
  if (body.totalInstallments !== undefined) {
    patch.totalInstallments =
      body.totalInstallments === null || body.totalInstallments === ""
        ? null
        : parseOptionalPositiveInt(
            body.totalInstallments,
            "Total installments",
            errors,
          );
  }
  if (body.status !== undefined) {
    if (!INSTALLMENT_STATUSES.includes(body.status)) {
      errors.push("Invalid status");
    } else {
      patch.status = body.status;
    }
  }
  if (
    body.payments !== undefined ||
    body.outstandingBalance !== undefined ||
    body.prepaidPaymentsCount !== undefined ||
    body.prepaidPaymentAmounts !== undefined ||
    body.downPaymentAmount !== undefined ||
    body.downPaymentDate !== undefined
  ) {
    errors.push(
      "Use create for down payment and already-paid fields; use payments to log installments",
    );
  }

  if (
    patch.totalAmount &&
    patch.installmentAmount &&
    patch.installmentAmount > patch.totalAmount
  ) {
    errors.push("Typical installment cannot exceed total amount");
  }
  if (patch.startDate && patch.endDate) {
    assertDateOnOrAfter(patch.startDate, patch.endDate, "End date", errors);
  }

  return { ok: !errors.length, errors, patch };
}

export function validateKametiCreate(body) {
  const errors = [];
  const planName = limitString(body.planName, MAX_NAME);
  if (!planName) {
    errors.push("Plan name is required");
  }
  const contributionAmount = parseMoney(
    body.contributionAmount,
    "contribution amount",
    errors,
    {
      required: true,
    },
  );
  const startDate = parseDate(body.startDate, "start date", errors, { required: true });
  const totalParticipants = Number(body.totalParticipants);
  if (!Number.isInteger(totalParticipants) || totalParticipants < 1) {
    errors.push("Total participants must be a whole number of at least 1");
  }
  if (totalParticipants > 10_000) {
    errors.push("Total participants must not exceed 10000");
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  const contributionFrequency = parseFrequency(
    body.contributionFrequency || "monthly",
    errors,
  );
  const customIntervalDays = parseCustomIntervalDays(
    contributionFrequency,
    body.customIntervalDays,
    errors,
  );
  const endDate = parseDate(body.endDate, "end date", errors);
  assertDateOnOrAfter(startDate, endDate, "End date", errors);
  const totalExpected = roundMoney(totalParticipants * contributionAmount);
  const prepaidCount = parsePrepaidPaymentsCount(body.prepaidPaymentsCount, errors);
  const contributionPayments = buildPrepaidPaymentRecords({
    count: prepaidCount,
    amountPerPayment: contributionAmount,
    startDate,
    frequency: contributionFrequency,
    customIntervalDays,
    notePrefix: "Contribution paid",
  });
  if (prepaidCount > 0 && contributionPayments.length < prepaidCount) {
    errors.push("Could not generate all prepaid payment dates for this frequency");
  }
  if (sumPrepaidAmount(contributionPayments) > totalExpected) {
    errors.push("Already-paid total exceeds expected contributions for this plan");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: [],
    value: {
      planName,
      totalParticipants,
      contributionAmount,
      currency: limitString(body.currency, 8) || DEFAULT_PLANNING_CURRENCY,
      contributionFrequency,
      customIntervalDays,
      startDate,
      endDate,
      expectedPayoutDate: parseDate(
        body.expectedPayoutDate,
        "expected payout date",
        errors,
      ),
      contributionPayments,
      remainingContributionsOwed: totalExpected,
      status: "active",
      taskId: parseTaskId(body.taskId, errors),
      notes: limitString(body.notes, MAX_DESCRIPTION_LENGTH),
    },
  };
}

export function validateKametiUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.planName !== undefined) {
    patch.planName = limitString(body.planName, MAX_NAME);
  }
  if (body.expectedPayoutDate !== undefined) {
    patch.expectedPayoutDate = body.expectedPayoutDate
      ? parseDate(body.expectedPayoutDate, "expected payout date", errors)
      : null;
  }
  if (body.status !== undefined && KAMETI_STATUSES.includes(body.status)) {
    patch.status = body.status;
  }
  if (body.contributionPayments !== undefined) {
    errors.push("Use contribution payments endpoint");
  }
  return { ok: !errors.length, errors, patch };
}

export function validateSubscriptionCreate(body) {
  const errors = [];
  const manualBilling = Boolean(body.manualBilling);
  const serviceName = limitString(body.serviceName, MAX_NAME);
  if (!serviceName) {
    errors.push("Service name is required");
  }
  const amount = parseMoney(body.amount, "amount", errors, { required: true });
  const startDate = parseDate(body.startDate, "start date", errors, {
    required: !manualBilling,
  });
  const billingFrequency = parseFrequency(body.billingFrequency || "monthly", errors);
  const customIntervalDays = parseCustomIntervalDays(
    billingFrequency,
    body.customIntervalDays,
    errors,
  );

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  if (manualBilling) {
    const prepaidCount = parsePrepaidPaymentsCount(body.prepaidPaymentsCount, errors);
    if (prepaidCount > 0) {
      errors.push("Prepaid payments are not used for manual billing");
    }
    const nextBillingDate = parseDate(body.nextBillingDate, "next pay date", errors);
    if (errors.length) {
      return { ok: false, errors, value: null };
    }
    return {
      ok: true,
      errors: [],
      value: {
        serviceName,
        amount,
        currency: limitString(body.currency, 8) || DEFAULT_PLANNING_CURRENCY,
        billingFrequency,
        customIntervalDays,
        startDate,
        renewalDate: null,
        cancellationDate: null,
        autoRenew: false,
        manualBilling: true,
        paymentHistory: [],
        nextBillingDate,
        status: "active",
        taskId: parseTaskId(body.taskId, errors),
      },
    };
  }

  const prepaidCount = parsePrepaidPaymentsCount(body.prepaidPaymentsCount, errors);
  const paymentHistory = buildPrepaidPaymentRecords({
    count: prepaidCount,
    amountPerPayment: amount,
    startDate,
    frequency: billingFrequency,
    customIntervalDays,
    notePrefix: "Subscription paid",
  });
  if (prepaidCount > 0 && paymentHistory.length < prepaidCount) {
    errors.push("Could not generate all prepaid payment dates for this frequency");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  const nextBillingDate = nextDueDateAfterPrepaid({
    payments: paymentHistory,
    startDate,
    frequency: billingFrequency,
    customIntervalDays,
  });

  return {
    ok: true,
    errors: [],
    value: {
      serviceName,
      amount,
      currency: limitString(body.currency, 8) || DEFAULT_PLANNING_CURRENCY,
      billingFrequency,
      customIntervalDays,
      startDate,
      renewalDate: parseDate(body.renewalDate, "renewal date", errors),
      cancellationDate: null,
      autoRenew: body.autoRenew !== false,
      manualBilling: false,
      paymentHistory,
      nextBillingDate,
      status: "active",
      taskId: parseTaskId(body.taskId, errors),
    },
  };
}

export function validateSubscriptionUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.serviceName !== undefined) {
    const serviceName = limitString(body.serviceName, MAX_NAME);
    if (!serviceName) {
      errors.push("Service name cannot be empty");
    } else {
      patch.serviceName = serviceName;
    }
  }
  if (body.amount !== undefined) {
    patch.amount = parseMoney(body.amount, "amount", errors, { required: true });
  }
  if (body.billingFrequency !== undefined) {
    patch.billingFrequency = parseFrequency(body.billingFrequency, errors);
  }
  if (body.customIntervalDays !== undefined || body.billingFrequency !== undefined) {
    const frequency = patch.billingFrequency || body.billingFrequency || "monthly";
    patch.customIntervalDays = parseCustomIntervalDays(
      frequency,
      body.customIntervalDays,
      errors,
    );
  }
  if (body.startDate !== undefined) {
    patch.startDate = parseDate(body.startDate, "start date", errors, {
      required: true,
    });
  }
  if (body.autoRenew !== undefined) {
    patch.autoRenew = Boolean(body.autoRenew);
  }
  if (body.manualBilling !== undefined) {
    patch.manualBilling = Boolean(body.manualBilling);
    if (patch.manualBilling) {
      patch.autoRenew = false;
    }
  }
  if (body.nextBillingDate !== undefined) {
    patch.nextBillingDate = body.nextBillingDate
      ? parseDate(body.nextBillingDate, "next pay date", errors)
      : null;
  }
  if (body.cancellationDate !== undefined) {
    patch.cancellationDate = body.cancellationDate
      ? parseDate(body.cancellationDate, "cancellation date", errors)
      : null;
  }
  if (body.status !== undefined && SUBSCRIPTION_STATUSES.includes(body.status)) {
    patch.status = body.status;
  }
  if (body.paymentHistory !== undefined) {
    errors.push("Use subscription payments endpoint");
  }
  return { ok: !errors.length, errors, patch };
}

export function validateApplicationCreate(body) {
  const errors = [];
  const universityName = limitString(body.universityName, MAX_NAME);
  const programName = limitString(body.programName, MAX_NAME);
  if (!universityName) {
    errors.push("University name is required");
  }
  if (!programName) {
    errors.push("Program name is required");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return {
    ok: true,
    errors: [],
    value: {
      universityName,
      programName,
      applicationDeadline: parseDate(
        body.applicationDeadline,
        "application deadline",
        errors,
      ),
      applicationFee: parseMoney(body.applicationFee, "application fee", errors),
      feeCurrency: limitString(body.feeCurrency, 8) || DEFAULT_PLANNING_CURRENCY,
      feePaymentStatus: FEE_PAYMENT_STATUSES.includes(body.feePaymentStatus)
        ? body.feePaymentStatus
        : "unpaid",
      applicationStatus: APPLICATION_STATUSES.includes(body.applicationStatus)
        ? body.applicationStatus
        : "researching",
      submissionDate: parseDate(body.submissionDate, "submission date", errors),
      resultDate: parseDate(body.resultDate, "result date", errors),
      notes: limitString(body.notes, MAX_DESCRIPTION_LENGTH),
      relatedTaskIds: [],
    },
  };
}

export function validateApplicationUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.universityName !== undefined) {
    patch.universityName = limitString(body.universityName, MAX_NAME);
  }
  if (body.programName !== undefined) {
    patch.programName = limitString(body.programName, MAX_NAME);
  }
  if (body.applicationDeadline !== undefined) {
    patch.applicationDeadline = body.applicationDeadline
      ? parseDate(body.applicationDeadline, "application deadline", errors)
      : null;
  }
  if (body.applicationStatus !== undefined) {
    if (!APPLICATION_STATUSES.includes(body.applicationStatus)) {
      errors.push("Invalid application status");
    } else {
      patch.applicationStatus = body.applicationStatus;
    }
  }
  if (body.feePaymentStatus !== undefined) {
    if (!FEE_PAYMENT_STATUSES.includes(body.feePaymentStatus)) {
      errors.push("Invalid fee payment status");
    } else {
      patch.feePaymentStatus = body.feePaymentStatus;
    }
  }
  if (body.notes !== undefined) {
    patch.notes = limitString(body.notes, MAX_DESCRIPTION_LENGTH);
  }
  return { ok: !errors.length, errors, patch };
}

export function validateTourCreate(body) {
  const errors = [];
  const name = limitString(body.name, MAX_NAME);
  if (!name) {
    errors.push("Tour name is required");
  }
  const startDate = parseDate(body.startDate, "start date", errors, { required: true });
  const endDate = parseDate(body.endDate, "end date", errors, { required: true });
  if (startDate && endDate && endDate < startDate) {
    errors.push("End date must be on or after start date");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return {
    ok: true,
    errors: [],
    value: {
      name,
      destination: limitString(body.destination, MAX_NAME),
      startDate,
      endDate,
      estimatedBudget: parseMoney(body.estimatedBudget, "estimated budget", errors),
      currency: limitString(body.currency, 8) || DEFAULT_PLANNING_CURRENCY,
      expenses: [],
      actualTotalExpenses: 0,
      bookingStatus: TOUR_BOOKING_STATUSES.includes(body.bookingStatus)
        ? body.bookingStatus
        : "planning",
      paymentStatus: TOUR_PAYMENT_STATUSES.includes(body.paymentStatus)
        ? body.paymentStatus
        : "unpaid",
      accommodation: limitString(body.accommodation, MAX_DESCRIPTION_LENGTH),
      transport: limitString(body.transport, MAX_DESCRIPTION_LENGTH),
      notes: limitString(body.notes, MAX_DESCRIPTION_LENGTH),
      relatedTaskIds: [],
    },
  };
}

export function validateTourUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.name !== undefined) {
    patch.name = limitString(body.name, MAX_NAME);
  }
  if (body.destination !== undefined) {
    patch.destination = limitString(body.destination, MAX_NAME);
  }
  if (body.startDate !== undefined) {
    patch.startDate = parseDate(body.startDate, "start date", errors);
  }
  if (body.endDate !== undefined) {
    patch.endDate = parseDate(body.endDate, "end date", errors);
  }
  if (body.estimatedBudget !== undefined) {
    patch.estimatedBudget =
      body.estimatedBudget === null || body.estimatedBudget === ""
        ? null
        : parseMoney(body.estimatedBudget, "estimated budget", errors);
  }
  if (
    body.bookingStatus !== undefined &&
    TOUR_BOOKING_STATUSES.includes(body.bookingStatus)
  ) {
    patch.bookingStatus = body.bookingStatus;
  }
  if (
    body.paymentStatus !== undefined &&
    TOUR_PAYMENT_STATUSES.includes(body.paymentStatus)
  ) {
    patch.paymentStatus = body.paymentStatus;
  }
  if (body.accommodation !== undefined) {
    patch.accommodation = limitString(body.accommodation, MAX_DESCRIPTION_LENGTH);
  }
  if (body.transport !== undefined) {
    patch.transport = limitString(body.transport, MAX_DESCRIPTION_LENGTH);
  }
  if (body.notes !== undefined) {
    patch.notes = limitString(body.notes, MAX_DESCRIPTION_LENGTH);
  }
  if (body.expenses !== undefined) {
    errors.push("Use tour expenses endpoint");
  }
  return { ok: !errors.length, errors, patch };
}

function resolveInsuranceEndDate(startDate, endDate, termYears, errors) {
  if (endDate) {
    return endDate;
  }
  if (!startDate || !termYears) {
    return null;
  }
  const startYmd = dateToYmd(startDate, DEFAULT_SCHEDULE_TIMEZONE);
  const endYmd = addIntervalToYmd(startYmd, termYears, "years");
  if (!endYmd) {
    errors.push("Could not compute end date from term years");
    return null;
  }
  return new Date(`${endYmd}T12:00:00.000Z`);
}

export function validateInsuranceCreate(body) {
  const errors = [];
  const insurerName = limitString(body.insurerName, MAX_NAME);
  if (!insurerName) {
    errors.push("Insurer name is required");
  }
  const policyNumber = limitString(body.policyNumber, 100);
  if (!policyNumber) {
    errors.push("Policy number is required");
  }
  const premiumAmount = parseMoney(body.premiumAmount, "premium amount", errors, {
    required: true,
  });
  const startDate = parseDate(body.startDate, "start date", errors, { required: true });
  const frequency = parseFrequency(body.frequency || "yearly", errors);
  const customIntervalDays = parseCustomIntervalDays(
    frequency,
    body.customIntervalDays,
    errors,
  );
  const termYears = parseOptionalPositiveInt(body.termYears, "Term years", errors, {
    max: 100,
  });
  let endDate = parseDate(body.endDate, "end date", errors);
  endDate = resolveInsuranceEndDate(startDate, endDate, termYears, errors);
  assertDateOnOrAfter(startDate, endDate, "End date", errors);

  let totalPremiumPayments = parseOptionalPositiveInt(
    body.totalPremiumPayments,
    "Total premium payments",
    errors,
  );
  if (termYears && frequency === "yearly" && !totalPremiumPayments) {
    totalPremiumPayments = termYears;
  }

  let totalPremiumAmount = parseMoney(body.totalPremiumAmount, "total premium", errors);
  if (!totalPremiumAmount && premiumAmount && totalPremiumPayments) {
    totalPremiumAmount = roundMoney(premiumAmount * totalPremiumPayments);
  }
  if (!totalPremiumAmount && premiumAmount) {
    totalPremiumAmount = premiumAmount;
  }
  if (!totalPremiumAmount) {
    errors.push(
      "Enter total premium or premium amount with payment count / term years",
    );
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  const prepaidCount = parsePrepaidPaymentsCount(body.prepaidPaymentsCount, errors);
  let payments = [];
  if (prepaidCount > 0) {
    payments = buildPrepaidPaymentRecords({
      count: prepaidCount,
      amountPerPayment: premiumAmount,
      startDate,
      frequency,
      customIntervalDays,
      notePrefix: "Premium paid",
    });
    if (payments.length < prepaidCount) {
      errors.push("Could not generate all prepaid payment dates for this frequency");
    }
  }
  const prepaidTotal = sumPrepaidAmount(payments);
  if (prepaidTotal > totalPremiumAmount) {
    errors.push("Already-paid total exceeds total premium");
  }
  if (totalPremiumPayments && payments.length > totalPremiumPayments) {
    errors.push("Already-paid periods exceed total premium payments");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: [],
    value: {
      insurerName,
      policyNumber,
      description: limitString(body.description, MAX_DESCRIPTION_LENGTH),
      premiumAmount,
      totalPremiumAmount,
      currency: limitString(body.currency, 8) || DEFAULT_PLANNING_CURRENCY,
      frequency,
      customIntervalDays,
      startDate,
      endDate,
      termYears,
      totalPremiumPayments,
      outstandingBalance: totalPremiumAmount,
      premiumsPaid: 0,
      status: "active",
      payments,
      taskId: parseTaskId(body.taskId, errors),
    },
  };
}

export function validateInsuranceUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.insurerName !== undefined) {
    const insurerName = limitString(body.insurerName, MAX_NAME);
    if (!insurerName) {
      errors.push("Insurer name cannot be empty");
    } else {
      patch.insurerName = insurerName;
    }
  }
  if (body.policyNumber !== undefined) {
    const policyNumber = limitString(body.policyNumber, 100);
    if (!policyNumber) {
      errors.push("Policy number cannot be empty");
    } else {
      patch.policyNumber = policyNumber;
    }
  }
  if (body.description !== undefined) {
    patch.description = limitString(body.description, MAX_DESCRIPTION_LENGTH);
  }
  if (body.premiumAmount !== undefined) {
    patch.premiumAmount = parseMoney(body.premiumAmount, "premium amount", errors, {
      required: true,
    });
  }
  if (body.totalPremiumAmount !== undefined) {
    patch.totalPremiumAmount = parseMoney(
      body.totalPremiumAmount,
      "total premium",
      errors,
      { required: true },
    );
  }
  if (body.frequency !== undefined) {
    patch.frequency = parseFrequency(body.frequency, errors);
  }
  if (body.customIntervalDays !== undefined || body.frequency !== undefined) {
    const frequency = patch.frequency || body.frequency || "yearly";
    patch.customIntervalDays = parseCustomIntervalDays(
      frequency,
      body.customIntervalDays,
      errors,
    );
  }
  if (body.startDate !== undefined) {
    patch.startDate = parseDate(body.startDate, "start date", errors, {
      required: true,
    });
  }
  if (body.termYears !== undefined) {
    patch.termYears =
      body.termYears === null || body.termYears === ""
        ? null
        : parseOptionalPositiveInt(body.termYears, "Term years", errors, { max: 100 });
  }
  if (body.endDate !== undefined) {
    patch.endDate = body.endDate ? parseDate(body.endDate, "end date", errors) : null;
  }
  if (body.totalPremiumPayments !== undefined) {
    patch.totalPremiumPayments =
      body.totalPremiumPayments === null || body.totalPremiumPayments === ""
        ? null
        : parseOptionalPositiveInt(
            body.totalPremiumPayments,
            "Total premium payments",
            errors,
          );
  }
  if (body.status !== undefined) {
    if (!INSURANCE_POLICY_STATUSES.includes(body.status)) {
      errors.push("Invalid status");
    } else {
      patch.status = body.status;
    }
  }
  if (body.payments !== undefined || body.outstandingBalance !== undefined) {
    errors.push("Use the payments endpoint to record premium payments");
  }
  return { ok: !errors.length, errors, patch };
}

export function validatePlanningPayment(body) {
  const errors = [];
  const amount = parseMoney(body.amount, "amount", errors, { required: true });
  const paidAt = parseDate(body.paidAt, "payment date", errors) || new Date();
  const note = limitString(body.note, 2000);
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: [], value: { amount, paidAt, note } };
}

export function validateInstallmentPaymentLog(body) {
  const errors = [];
  const amount = parseMoney(body.amount, "amount", errors, { required: true });
  const paidAt = parseDate(body.paidAt, "payment date", errors) || new Date();
  let kind = body.paymentKind;
  if (kind === undefined || kind === null || kind === "") {
    kind = "installment";
  } else if (typeof kind === "string") {
    kind = kind.trim();
  } else {
    errors.push("Invalid payment type");
    kind = "installment";
  }
  if (!INSTALLMENT_LOG_PAYMENT_KINDS.includes(kind)) {
    errors.push("Invalid payment type");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return {
    ok: true,
    errors: [],
    value: { amount, paidAt, note: installmentPaymentNoteForKind(kind) },
  };
}

export function validateTourExpense(body) {
  const errors = [];
  const amount = parseMoney(body.amount, "amount", errors, { required: true });
  const date = parseDate(body.date, "expense date", errors, { required: true });
  const category = limitString(body.category, 100) || "General";
  const note = limitString(body.note, 2000);
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: [], value: { amount, date, category, note } };
}

export function validateKametiPayout(body) {
  const errors = [];
  const payoutAmount = parseMoney(body.payoutAmount, "payout amount", errors, {
    required: true,
  });
  const payoutReceivedAt =
    parseDate(body.payoutReceivedAt, "payout date", errors) || new Date();
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: [], value: { payoutAmount, payoutReceivedAt } };
}
