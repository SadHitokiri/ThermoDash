"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useDevices } from "@/lib/hooks/useDevices";
import { useSensorNames } from "@/lib/hooks/useSensorNames";

export default function Devices() {
  const devices = useDevices();
  const { sensorNames, updateSensorName } = useSensorNames();
  const [editingDeviceId, setEditingDeviceId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [savingDeviceId, setSavingDeviceId] = useState("");
  const [errorDeviceId, setErrorDeviceId] = useState("");

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
            {Array.from(devices.values()).map((device) => {
              const displayName = sensorNames.get(device.deviceId)?.trim();
              const isEditing = editingDeviceId === device.deviceId;
              const isSaving = savingDeviceId === device.deviceId;

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
                    {device.temperature != null ? (
                      <span className="text-[var(--color-primary)] font-semibold">
                        {device.temperature.toFixed(2)}
                        {"\u00b0C"}
                      </span>
                    ) : (
                      "Unknown"
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
