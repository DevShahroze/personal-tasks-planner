"use client";

import { useState } from "react";
import { canAddMilestone } from "@/lib/current-projects/milestones";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import Alert from "@/components/ui/alert";
import { formatDate, formatDateTime } from "@/lib/format";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

export default function CurrentProjectMilestones({
  project,
  onAddMilestone,
  onAchieveMilestone,
  onUpdateMilestone,
  pending = false,
}) {
  const [text, setText] = useState("");
  const [addedAt, setAddedAt] = useState(todayDateInputValue());
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const milestones = project.milestones || [];
  const allowAdd = canAddMilestone(milestones);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Milestones</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Track versions or goals in order. Mark each achieved before adding the next.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {milestones.length ? (
        <ol className="space-y-3">
          {milestones.map((milestone, index) => (
            <MilestoneItem
              key={milestone._id}
              milestone={milestone}
              index={index}
              pending={pending}
              editing={editingId === String(milestone._id)}
              onStartEdit={() => {
                setError("");
                setEditingId(String(milestone._id));
              }}
              onCancelEdit={() => setEditingId(null)}
              onAchieve={async () => {
                setError("");
                try {
                  await onAchieveMilestone({
                    milestoneId: milestone._id,
                  });
                } catch (err) {
                  setError(err.message || "Could not mark milestone achieved");
                }
              }}
              onSaveEdit={async (values) => {
                setError("");
                try {
                  await onUpdateMilestone({
                    milestoneId: milestone._id,
                    ...values,
                  });
                  setEditingId(null);
                } catch (err) {
                  setError(err.message || "Could not save milestone");
                }
              }}
            />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      )}

      {allowAdd ? (
        <form
          className="space-y-3 border-t border-border pt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              await onAddMilestone({
                text,
                addedAt: addedAt || todayDateInputValue(),
              });
              setText("");
              setAddedAt(todayDateInputValue());
            } catch (err) {
              setError(err.message || "Could not add milestone");
            }
          }}
        >
          <label className="block space-y-1 text-sm">
            <span>New milestone</span>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="What you want to reach in this step…"
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Added</span>
            <Input
              type="date"
              value={addedAt}
              onChange={(e) => setAddedAt(e.target.value)}
              required
            />
          </label>
          <Button type="submit" disabled={pending || !text.trim()}>
            {pending ? "Saving…" : "Add milestone"}
          </Button>
        </form>
      ) : (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Achieve the active milestone above before adding another.
        </p>
      )}
    </section>
  );
}

function MilestoneItem({
  milestone,
  index,
  pending,
  editing,
  onStartEdit,
  onCancelEdit,
  onAchieve,
  onSaveEdit,
}) {
  const isOpen = !milestone.achievedAt;
  const [editText, setEditText] = useState(milestone.text);
  const [editAddedAt, setEditAddedAt] = useState(dateInputValue(milestone.addedAt));

  return (
    <li className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Milestone {index + 1}
          {isOpen ? " · Active" : " · Achieved"}
        </span>
        <span>
          Added {formatDate(milestone.addedAt)}
          {milestone.achievedAt
            ? ` · Achieved ${formatDateTime(milestone.achievedAt)}`
            : ""}
        </span>
      </div>

      {editing ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSaveEdit({
              text: editText,
              addedAt: editAddedAt,
            });
          }}
        >
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            required
          />
          <label className="block space-y-1 text-sm">
            <span>Added</span>
            <Input
              type="date"
              value={editAddedAt}
              onChange={(e) => setEditAddedAt(e.target.value)}
              required
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onCancelEdit}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !editText.trim()}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-wrap text-sm">{milestone.text}</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {isOpen ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setEditText(milestone.text);
                  setEditAddedAt(dateInputValue(milestone.addedAt));
                  onStartEdit();
                }}
              >
                Edit
              </Button>
            ) : null}
            {isOpen ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={onAchieve}
              >
                {pending ? "Saving…" : "Mark achieved"}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}
