"use client";

import { useEffect, useState } from "react";
import Tile from "./components/Tile";
import { useDevices } from "../lib/hooks/useDevices";
import { useSensorNames } from "../lib/hooks/useSensorNames";
import { applyTemperatureCalibration } from "../lib/calibration";
import LineChart from "./components/LineChart";

type ChartCount = "all" | "2" | "1";

const chartCountOptions: Array<{ label: string; value: ChartCount }> = [
  { label: "All", value: "all" },
  { label: "2", value: "2" },
  { label: "1", value: "1" },
];

export default function Page() {
  const [chartCount, setChartCount] = useState<ChartCount>("all");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [draftSelectedDeviceIds, setDraftSelectedDeviceIds] = useState<string[]>([]);
  const [isChangingDevices, setIsChangingDevices] = useState(false);
  const devices = useDevices();
  const {
    sensorNames,
    sensorCalibrations,
    updateSensorName,
    updateSensorCalibration,
  } = useSensorNames();

  const allDevices = Array.from(devices.values());
  const chartLimit = chartCount === "all" ? allDevices.length : Number(chartCount);
  const availableDeviceIds = allDevices.map((device) => device.deviceId);
  const validSelectedDeviceIds = selectedDeviceIds.filter((deviceId) =>
    availableDeviceIds.includes(deviceId)
  );
  const filledSelectedDeviceIds =
    chartCount === "all"
      ? availableDeviceIds
      : [
          ...validSelectedDeviceIds,
          ...availableDeviceIds.filter((deviceId) => !validSelectedDeviceIds.includes(deviceId)),
        ].slice(0, chartLimit);
  const visibleDevices =
    chartCount === "all"
      ? allDevices
      : filledSelectedDeviceIds
          .map((deviceId) => devices.get(deviceId))
          .filter((device) => device != null);
  const gridClassName =
    chartCount === "1"
      ? "grid grid-cols-1 gap-6 p-6"
      : chartCount === "2"
        ? "grid grid-cols-1 xl:grid-cols-2 gap-6 p-6"
        : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6";

  useEffect(() => {
    setSelectedDeviceIds((current) =>
      current.filter((deviceId) => availableDeviceIds.includes(deviceId))
    );
  }, [availableDeviceIds.join("|")]);

  function openDeviceSelector() {
    setDraftSelectedDeviceIds(filledSelectedDeviceIds);
    setIsChangingDevices(true);
  }

  function toggleDraftDevice(deviceId: string) {
    setDraftSelectedDeviceIds((current) => {
      if (chartLimit === 1) {
        return [deviceId];
      }

      if (current.includes(deviceId)) {
        return current.filter((selectedDeviceId) => selectedDeviceId !== deviceId);
      }

      return [...current, deviceId].slice(-chartLimit);
    });
  }

  function applyDeviceSelection() {
    setSelectedDeviceIds(draftSelectedDeviceIds.slice(0, chartLimit));
    setIsChangingDevices(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">Dashboard</h1>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1">
          {chartCountOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                chartCount === option.value
                  ? "rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-foreground)]/70 transition hover:bg-[var(--color-secondary)]/15 hover:text-[var(--color-foreground)]"
              }
              onClick={() => setChartCount(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {chartCount !== "all" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 px-6">
          <button
            type="button"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm font-medium text-[var(--color-foreground)]/80 transition hover:bg-[var(--color-secondary)]/15 hover:text-[var(--color-foreground)]"
            onClick={openDeviceSelector}
          >
            Change
          </button>
          <span className="text-sm text-[var(--color-foreground)]/55">
            {visibleDevices
              .map((device) => sensorNames.get(device.deviceId)?.trim() || device.deviceId)
              .join(", ")}
          </span>
        </div>
      )}

      {isChangingDevices && chartCount !== "all" && (
        <div className="mx-6 mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              Select {chartLimit} chart{chartLimit > 1 ? "s" : ""}
            </span>
            <span className="text-xs text-[var(--color-foreground)]/50">
              {draftSelectedDeviceIds.length}/{chartLimit}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {allDevices.map((device) => {
              const displayName = sensorNames.get(device.deviceId)?.trim();
              const isSelected = draftSelectedDeviceIds.includes(device.deviceId);

              return (
                <button
                  key={device.deviceId}
                  type="button"
                  className={
                    isSelected
                      ? "flex items-center justify-between rounded-md border border-[var(--color-primary)] bg-[var(--color-secondary)]/20 px-3 py-2 text-left text-sm font-medium"
                      : "flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--color-secondary)]/15"
                  }
                  onClick={() => toggleDraftDevice(device.deviceId)}
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {displayName || device.deviceId}
                    </span>
                    {displayName && (
                      <span className="block truncate text-xs font-normal text-[var(--color-foreground)]/50">
                        {device.deviceId}
                      </span>
                    )}
                  </span>
                  <span className="ml-3 text-xs text-[var(--color-primary)]">
                    {isSelected ? "Selected" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--color-secondary)]/15"
              onClick={() => setIsChangingDevices(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-50"
              onClick={applyDeviceSelection}
              disabled={draftSelectedDeviceIds.length === 0}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      <div className={gridClassName}>
        {visibleDevices.map((device) => {
          const calibrationExpression = sensorCalibrations.get(device.deviceId);
          const temperature =
            device.temperature != null
              ? applyTemperatureCalibration(device.temperature, calibrationExpression)
              : null;
          const chartPoints = device.history.map((point) => ({
            timestamp: point.timestamp,
            temperature: applyTemperatureCalibration(point.temperature, calibrationExpression),
          }));

          return (
            <Tile
              key={device.deviceId}
              title={device.lastSeen}
              device={device.deviceId}
              displayName={sensorNames.get(device.deviceId)}
              onRename={updateSensorName}
              calibrationExpression={calibrationExpression}
              onCalibrationUpdate={updateSensorCalibration}
              status={
                temperature != null
                  ? `${temperature.toFixed(2)}\u00b0C`
                  : "Unknown"
              }
            >
              <LineChart points={chartPoints} />
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
