"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useDevices } from "@/lib/hooks/useDevices";
import { useSensorNames } from "@/lib/hooks/useSensorNames";
import { applyTemperatureCalibration } from "@/lib/calibration";

const deviceSearchTimeoutMs = 60 * 1000;

function DevicesTableSkeleton() {
  return (
    <tr>
      <td colSpan={3} className="px-6 py-10">
        <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/35 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-border)]/70" />
              <div className="h-5 w-44 animate-pulse rounded bg-[var(--color-border)]/80" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-border)]/70" />
              <div className="h-6 w-28 animate-pulse rounded bg-[var(--color-secondary)]/20" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-border)]/70" />
              <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-border)]/80" />
            </div>
          </div>
          <div className="mt-5 text-center text-sm font-medium text-[var(--color-foreground)]/60">
            Searching for Arduino devices...
          </div>
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10" />
        </div>
      </td>
    </tr>
  );
}

function EmptyDevicesState() {
  return (
    <tr>
      <td colSpan={3} className="px-6 py-12 text-center">
        <div className="text-base font-semibold text-[var(--color-foreground)]">
          No Arduino devices detected
        </div>
        <p className="mt-2 text-sm text-[var(--color-foreground)]/60">
          Nothing appears to be connected. Plug in an Arduino or check the USB cable and port permissions.
        </p>
      </td>
    </tr>
  );
}

export default function Devices() {
  const devices = useDevices();
  const {
    sensorNames,
    sensorCalibrations,
    updateSensorName,
    updateSensorCalibration,
  } = useSensorNames();
  const [editingDeviceId, setEditingDeviceId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [savingDeviceId, setSavingDeviceId] = useState("");
  const [errorDeviceId, setErrorDeviceId] = useState("");
  const [editingCalibrationDeviceId, setEditingCalibrationDeviceId] = useState("");
  const [draftCalibration, setDraftCalibration] = useState("");
  const [savingCalibrationDeviceId, setSavingCalibrationDeviceId] = useState("");
  const [errorCalibrationDeviceId, setErrorCalibrationDeviceId] = useState("");
  const [hasDeviceSearchTimedOut, setHasDeviceSearchTimedOut] = useState(false);
  const deviceList = Array.from(devices.values());

  useEffect(() => {
    if (deviceList.length > 0) {
      setHasDeviceSearchTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasDeviceSearchTimedOut(true);
    }, deviceSearchTimeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [deviceList.length]);

  function startEditing(deviceId: string, displayName?: string) {
    setEditingDeviceId(deviceId);
    setDraftName(displayName || "");
    setErrorDeviceId("");
  }

  function cancelEditing() {
    setEditingDeviceId("");
    setDraftName("");
    setSavingDeviceId("");
    setErrorDeviceId("");
  }

  async function saveName(deviceId: string, event?: FormEvent) {
    event?.preventDefault();

    if (savingDeviceId) return;

    setSavingDeviceId(deviceId);
    setErrorDeviceId("");

    try {
      await updateSensorName(deviceId, draftName);
      setEditingDeviceId("");
      setDraftName("");
    } catch {
      setErrorDeviceId(deviceId);
    } finally {
      setSavingDeviceId("");
    }
  }

  function startEditingCalibration(deviceId: string, expression?: string) {
    setEditingCalibrationDeviceId(deviceId);
    setDraftCalibration(expression || "");
    setErrorCalibrationDeviceId("");
  }

  function cancelEditingCalibration() {
    setEditingCalibrationDeviceId("");
    setDraftCalibration("");
    setSavingCalibrationDeviceId("");
    setErrorCalibrationDeviceId("");
  }

  async function saveCalibration(deviceId: string, event?: FormEvent) {
    event?.preventDefault();

    if (savingCalibrationDeviceId) return;

    setSavingCalibrationDeviceId(deviceId);
    setErrorCalibrationDeviceId("");

    try {
      await updateSensorCalibration(deviceId, draftCalibration);
      setEditingCalibrationDeviceId("");
      setDraftCalibration("");
    } catch {
      setErrorCalibrationDeviceId(deviceId);
    } finally {
      setSavingCalibrationDeviceId("");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl">Devices</h1>
      <div className="bg-[var(--color-card)] shadow-lg rounded-2xl overflow-hidden border border-[var(--color-border)]">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[var(--color-background)] text-[var(--color-foreground)]/70 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-3">Device</th>
              <th className="px-6 py-3">Temperature</th>
              <th className="px-6 py-3">Last Seen</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-border)]">
            {deviceList.length === 0 && hasDeviceSearchTimedOut ? (
              <EmptyDevicesState />
            ) : deviceList.length === 0 ? (
              <DevicesTableSkeleton />
            ) : deviceList.map((device) => {
              const displayName = sensorNames.get(device.deviceId)?.trim();
              const calibrationExpression = sensorCalibrations.get(device.deviceId);
              const temperature =
                device.temperature != null
                  ? applyTemperatureCalibration(device.temperature, calibrationExpression)
                  : null;
              const isEditing = editingDeviceId === device.deviceId;
              const isSaving = savingDeviceId === device.deviceId;
              const isEditingCalibration = editingCalibrationDeviceId === device.deviceId;
              const isSavingCalibration = savingCalibrationDeviceId === device.deviceId;

              return (
                <tr
                  key={device.deviceId}
                  className="hover:bg-[var(--color-secondary)]/20 transition-colors duration-200"
                >
                  <td className="px-6 py-4 font-medium">
                    {isEditing ? (
                      <form
                        className="flex min-w-0 items-center gap-2"
                        onSubmit={(event) => saveName(device.deviceId, event)}
                      >
                        <input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          autoFocus
                          placeholder={device.deviceId}
                          className="h-8 min-w-0 max-w-[220px] rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-sm font-semibold text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)]"
                        />
                        <button
                          type="submit"
                          title="Save"
                          aria-label="Save"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-50"
                          disabled={isSaving}
                        >
                          {isSaving ? "..." : "\u2713"}
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          aria-label="Cancel"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-semibold text-[var(--color-foreground)]/70 transition hover:bg-[var(--color-secondary)]/15"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          x
                        </button>
                        {errorDeviceId === device.deviceId && (
                          <span className="text-xs font-medium text-red-500">
                            Could not save name
                          </span>
                        )}
                      </form>
                    ) : (
                      <div className="group flex min-w-0 items-center gap-2">
                        {displayName ? (
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{displayName}</span>
                            <span className="text-xs font-normal text-[var(--color-foreground)]/50">
                              {device.deviceId}
                            </span>
                          </div>
                        ) : (
                          <span className="truncate">{device.deviceId}</span>
                        )}
                        <button
                          type="button"
                          title="Edit"
                          aria-label="Edit"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm text-[var(--color-foreground)]/45 opacity-0 transition hover:bg-[var(--color-secondary)]/15 hover:text-[var(--color-primary)] group-hover:opacity-100 focus:opacity-100"
                          onClick={() =>
                            startEditing(device.deviceId, displayName)
                          }
                        >
                          {"\u270e"}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {isEditingCalibration ? (
                      <form
                        className="flex min-w-0 items-center gap-2"
                        onSubmit={(event) => saveCalibration(device.deviceId, event)}
                      >
                        <input
                          value={draftCalibration}
                          onChange={(event) => setDraftCalibration(event.target.value)}
                          autoFocus
                          placeholder="*1.05 +0.4"
                          className="h-8 min-w-0 max-w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-sm font-semibold text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)]"
                        />
                        <button
                          type="submit"
                          title="Save"
                          aria-label="Save"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-50"
                          disabled={isSavingCalibration}
                        >
                          {isSavingCalibration ? "..." : "\u2713"}
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          aria-label="Cancel"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-semibold text-[var(--color-foreground)]/70 transition hover:bg-[var(--color-secondary)]/15"
                          onClick={cancelEditingCalibration}
                          disabled={isSavingCalibration}
                        >
                          x
                        </button>
                        {errorCalibrationDeviceId === device.deviceId && (
                          <span className="text-xs font-medium text-red-500">
                            Use +1, *2, or *1.05 +0.4
                          </span>
                        )}
                      </form>
                    ) : (
                      <div className="group flex min-w-0 items-center gap-2">
                        <div className="flex min-w-0 flex-col">
                          <span
                            className={
                              temperature != null
                                ? "text-base font-bold tabular-nums text-[var(--color-primary)]"
                                : "text-[var(--color-foreground)]/60"
                            }
                          >
                            {temperature != null ? (
                              <>
                                {Math.round(temperature)}
                                {"\u00b0C"}
                              </>
                            ) : (
                              "Unknown"
                            )}
                          </span>
                          {calibrationExpression && (
                            <span className="text-xs font-normal text-[var(--color-foreground)]/50">
                              Calibration: {calibrationExpression}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          title="Edit"
                          aria-label="Edit"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm text-[var(--color-foreground)]/45 opacity-0 transition hover:bg-[var(--color-secondary)]/15 hover:text-[var(--color-primary)] group-hover:opacity-100 focus:opacity-100"
                          onClick={() =>
                            startEditingCalibration(device.deviceId, calibrationExpression)
                          }
                        >
                          {"\u270e"}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-[var(--color-foreground)]/60">
                    {device.lastSeen || "Never"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
