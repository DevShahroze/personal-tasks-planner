import mongoose from "mongoose";
import { PAYMENT_FREQUENCIES } from "../schedules/frequency.js";
import {
  INSTALLMENT_STATUSES,
  KAMETI_STATUSES,
  SUBSCRIPTION_STATUSES,
  APPLICATION_STATUSES,
  FEE_PAYMENT_STATUSES,
  TOUR_BOOKING_STATUSES,
  TOUR_PAYMENT_STATUSES,
  DEFAULT_PLANNING_CURRENCY,
} from "./constants.js";
import { roundMoney } from "../finance/balance.js";
import { MAX_DESCRIPTION_LENGTH } from "../security/constants.js";

const MAX_NAME = 200;
const MAX_MONEY = 999_999_999_999.99;

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function parseMoney(value, label, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      errors.push(`${label} is required`);
    }
    return null;
  }
  const num = roundMoney(value);
  if (!Number.isFinite(Number(value)) || num <= 0 || num > MAX_MONEY) {
    errors.push(`Invalid ${label}`);
    return null;
  }
  return num;
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
  if (!mongoose.Types.ObjectId.isValid(String(value))) {
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
    {
      required: true,
    },
  );
  const startDate = parseDate(body.startDate, "start date", errors, { required: true });
  const frequency = parseFrequency(body.frequency || "monthly", errors);

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
      installmentAmount,
      currency: limitString(body.currency, 8) || DEFAULT_PLANNING_CURRENCY,
      frequency,
      customIntervalDays: body.customIntervalDays
        ? Number(body.customIntervalDays)
        : null,
      startDate,
      endDate: parseDate(body.endDate, "end date", errors),
      totalInstallments: body.totalInstallments ? Number(body.totalInstallments) : null,
      outstandingBalance: totalAmount,
      installmentsPaid: 0,
      status: "active",
      payments: [],
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
  if (body.endDate !== undefined) {
    patch.endDate = body.endDate ? parseDate(body.endDate, "end date", errors) : null;
  }
  if (body.status !== undefined) {
    if (!INSTALLMENT_STATUSES.includes(body.status)) {
      errors.push("Invalid status");
    } else {
      patch.status = body.status;
    }
  }
  if (body.payments !== undefined || body.outstandingBalance !== undefined) {
    errors.push("Use the payments endpoint to record payments");
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
    errors.push("Total participants must be at least 1");
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
      contributionFrequency: parseFrequency(
        body.contributionFrequency || "monthly",
        errors,
      ),
      customIntervalDays: body.customIntervalDays
        ? Number(body.customIntervalDays)
        : null,
      startDate,
      endDate: parseDate(body.endDate, "end date", errors),
      expectedPayoutDate: parseDate(
        body.expectedPayoutDate,
        "expected payout date",
        errors,
      ),
      contributionPayments: [],
      remainingContributionsOwed: roundMoney(totalParticipants * contributionAmount),
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
  const serviceName = limitString(body.serviceName, MAX_NAME);
  if (!serviceName) {
    errors.push("Service name is required");
  }
  const amount = parseMoney(body.amount, "amount", errors, { required: true });
  const startDate = parseDate(body.startDate, "start date", errors, { required: true });

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
      billingFrequency: parseFrequency(body.billingFrequency || "monthly", errors),
      customIntervalDays: body.customIntervalDays
        ? Number(body.customIntervalDays)
        : null,
      startDate,
      renewalDate: parseDate(body.renewalDate, "renewal date", errors),
      cancellationDate: null,
      autoRenew: body.autoRenew !== false,
      paymentHistory: [],
      status: "active",
      taskId: parseTaskId(body.taskId, errors),
    },
  };
}

export function validateSubscriptionUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.serviceName !== undefined) {
    patch.serviceName = limitString(body.serviceName, MAX_NAME);
  }
  if (body.autoRenew !== undefined) {
    patch.autoRenew = Boolean(body.autoRenew);
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
