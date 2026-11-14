"use client";

import Modal from "@/components/ui/modal";
import WeatherToolPanel from "@/components/weather/weather-tool-panel";

export default function WeatherModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      title="Weather"
      onClose={onClose}
      panelClassName="max-w-3xl"
      scrollBody
    >
      <WeatherToolPanel />
    </Modal>
  );
}
