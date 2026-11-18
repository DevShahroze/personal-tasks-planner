"use client";

import Modal from "@/components/ui/modal";
import HolidayToolPanel from "@/components/holidays/holiday-tool-panel";

export default function HolidaysModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      title="Holiday calendar"
      onClose={onClose}
      panelClassName="max-w-2xl"
      scrollBody
    >
      <HolidayToolPanel />
    </Modal>
  );
}
