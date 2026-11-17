const MAX_MILESTONE_TEXT = 2000;

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

export function canAddMilestone(milestones) {
  if (!milestones?.length) {
    return true;
  }
  const last = milestones[milestones.length - 1];
  return Boolean(last?.achievedAt);
}

export function validateAddMilestone(body) {
  const errors = [];
  const text = limitString(body?.text, MAX_MILESTONE_TEXT);
  if (!text) {
    errors.push("Milestone text is required");
  }
  let addedAt = new Date();
  if (body?.addedAt !== undefined && body?.addedAt !== null && body.addedAt !== "") {
    const parsed = new Date(body.addedAt);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("Invalid milestone date");
    } else {
      addedAt = parsed;
    }
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return {
    ok: true,
    errors: [],
    value: { text, addedAt, achievedAt: null },
  };
}

export function validateAchieveMilestone(body) {
  const errors = [];
  const milestoneId =
    typeof body?.milestoneId === "string" ? body.milestoneId.trim() : "";
  if (!milestoneId) {
    errors.push("Milestone id is required");
  }
  let achievedAt = new Date();
  if (
    body?.achievedAt !== undefined &&
    body?.achievedAt !== null &&
    body.achievedAt !== ""
  ) {
    const parsed = new Date(body.achievedAt);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("Invalid achievement date");
    } else {
      achievedAt = parsed;
    }
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: [], value: { milestoneId, achievedAt } };
}
