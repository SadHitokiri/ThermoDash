"use client";

import { useEffect, useState } from "react";
import Tile from "./components/Tile";
import { useDevices } from "../lib/hooks/useDevices";
import { useSensorNames } from "../lib/hooks/useSensorNames";
import { applyTemperatureCalibration } from "../lib/calibration";
import LineChart from "./components/LineChart";

type ChartCount = "all" | "2" | "1";

const dashboardPreferencesStorageKey = "thermodash.dashboard.preferences";
const deviceSearchTimeoutMs = 60 * 1000;

const chartCountOptions: Array<{ label: string; value: ChartCount }> = [
  { label: "All", value: "all" },
  { label: "2", value: "2" },
  { label: "1", value: "1" },
];

function DashboardTileSkeleton({ message }: { message: string }) {
  return (
    <div className="col-span-full flex min-h-[320px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-28 animate-pulse rounded bg-[var(--color-border)]/70" />
          <div className="h-5 w-40 animate-pulse rounded bg-[var(--color-border)]/80" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-[var(--color-secondary)]/20" />
      </div>
      <div className="relative min-h-[180px] flex-1 overflow-hidden rounded-lg border border-[var(--color-border)]/50 bg-[var(--color-background)]/35">
        <div className="absolute inset-x-4 top-5 bottom-8 border-l border-b border-[var(--color-border)]/80">
          <div className="absolute inset-0 grid grid-rows-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className="border-t border-[var(--color-border)]/60"
              />
            ))}
          </div>
          <svg
            className="absolute inset-0 h-full w-full animate-pulse"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <polyline
              points="0,76 15,67 30,70 45,51 60,56 76,34 100,28"
              fill="none"
              stroke="var(--color-primary)"
              strokeOpacity="0.24"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10" />
      </div>
      <div className="mt-3 text-center text-sm font-medium text-[var(--color-foreground)]/60">
        {message}
      </div>
    </div>
  );
}

function EmptyDashboardState() {
  return (
    <div className="col-span-full flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
      <div className="text-base font-semibold text-[var(--color-foreground)]">
        No Arduino devices detected
      </div>
      <p className="mt-2 max-w-md text-sm text-[var(--color-foreground)]/60">
        Nothing appears to be connected. Plug in an Arduino or check the USB cable and port permissions.
      </p>
    </div>
  );
}

function isChartCount(value: unknown): value is ChartCount {
  return value === "all" || value === "2" || value === "1";
}

function readDashboardPreferences() {
  try {
    const savedPreferences = window.localStorage.getItem(dashboardPreferencesStorageKey);
    if (!savedPreferences) return null;

    const parsedPreferences = JSON.parse(savedPreferences) as {
      chartCount?: unknown;
      selectedDeviceIds?: unknown;
    };

    return {
      chartCount: isChartCount(parsedPreferences.chartCount)
        ? parsedPreferences.chartCount
        : "all",
      selectedDeviceIds: Array.isArray(parsedPreferences.selectedDeviceIds)
        ? parsedPreferences.selectedDeviceIds.filter((deviceId): deviceId is string => typeof deviceId === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export default function Page() {
  const [chartCount, setChartCount] = useState<ChartCount>("all");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [draftSelectedDeviceIds, setDraftSelectedDeviceIds] = useState<string[]>([]);
  const [isChangingDevices, setIsChangingDevices] = useState(false);
  const [areDashboardPreferencesLoaded, setAreDashboardPreferencesLoaded] = useState(false);
  const [hasDeviceSearchTimedOut, setHasDeviceSearchTimedOut] = useState(false);
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
      ? "grid flex-1 min-h-0 grid-cols-1 grid-rows-1 gap-6 p-6"
      : chartCount === "2"
        ? "grid flex-1 min-h-0 grid-cols-1 grid-rows-2 gap-6 p-6"
        : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6";
  const tileWrapperClassName =
    chartCount === "all" ? "" : "min-h-0 h-full";

  useEffect(() => {
    const savedPreferences = readDashboardPreferences();

    if (savedPreferences) {
      setChartCount(savedPreferences.chartCount);
      setSelectedDeviceIds(savedPreferences.selectedDeviceIds);
    }

    setAreDashboardPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!areDashboardPreferencesLoaded) return;

    window.localStorage.setItem(
      dashboardPreferencesStorageKey,
      JSON.stringify({ chartCount, selectedDeviceIds })
    );
  }, [areDashboardPreferencesLoaded, chartCount, selectedDeviceIds]);

  useEffect(() => {
    if (availableDeviceIds.length === 0) return;

    setSelectedDeviceIds((current) =>
      current.filter((deviceId) => availableDeviceIds.includes(deviceId))
    );
  }, [availableDeviceIds.join("|")]);

  useEffect(() => {
    if (allDevices.length > 0) {
      setHasDeviceSearchTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasDeviceSearchTimedOut(true);
    }, deviceSearchTimeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [allDevices.length]);

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
    <div className="flex h-full min-h-0 flex-col">
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
        {visibleDevices.length === 0 && hasDeviceSearchTimedOut ? (
          <EmptyDashboardState />
        ) : visibleDevices.length === 0 ? (
          <DashboardTileSkeleton message="Searching for Arduino devices..." />
        ) : visibleDevices.map((device) => {
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
            <div
              key={device.deviceId}
              className={tileWrapperClassName || undefined}
            >
              <Tile
                title={device.lastSeen}
                device={device.deviceId}
                displayName={sensorNames.get(device.deviceId)}
                onRename={updateSensorName}
                calibrationExpression={calibrationExpression}
                onCalibrationUpdate={updateSensorCalibration}
                status={
                  temperature != null
                    ? `${Math.round(temperature)}\u00b0C`
                    : "Unknown"
                }
              >
                <LineChart points={chartPoints} />
              </Tile>
            </div>
          );
        })}
      </div>
    </div>
  );
}
