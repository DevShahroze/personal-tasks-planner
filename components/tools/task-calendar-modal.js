"use client";

import Modal from "@/components/ui/modal";
import TaskCalendarPanel from "@/components/calendar/task-calendar-panel";

export default function TaskCalendarModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      title="Task calendar"
      onClose={onClose}
      panelClassName="max-w-5xl"
    >
      <TaskCalendarPanel variant="modal" />
    </Modal>
  );
}
