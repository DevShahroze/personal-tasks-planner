import { NextResponse } from "next/server";
import { isValidObjectId as isValidObjectIdImpl } from "./security/ids.js";

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message, status = 400, details = undefined) {
  const body = { error: message };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

export function jsonSchedulingConflict(conflicts) {
  return NextResponse.json(
    {
      error: "Scheduling conflict",
      conflicts,
    },
    { status: 409 },
  );
}

export function jsonIncompleteSubtasks(incompleteSubtasks) {
  return NextResponse.json(
    {
      error: "Complete all subtasks before completing this task",
      incompleteSubtasks,
    },
    { status: 409 },
  );
}

export function isValidObjectId(id) {
  return isValidObjectIdImpl(id);
}
