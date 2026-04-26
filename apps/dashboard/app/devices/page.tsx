"use client";

import { useDevices } from "@/lib/hooks/useDevices";

export default function Devices() {
  const devices = useDevices();

  return (
        <div className="space-y-6">
      <h1 className="text-xl">
        Devices
      </h1>
    <div className="bg-[var(--color-card)] shadow-lg rounded-2xl overflow-hidden border border-[var(--color-border)]">
      <table className="min-w-full text-sm text-left">
        
        <thead className="bg-[var(--color-background)] text-[var(--color-foreground)]/70 uppercase text-xs tracking-wider">
          <tr>
            <th className="px-6 py-3">Device ID</th>
            <th className="px-6 py-3">Temperature</th>
            <th className="px-6 py-3">Last Seen</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--color-border)]">
          {Array.from(devices.values()).map((device) => (
            <tr
              key={device.deviceId}
              className="hover:bg-[var(--color-secondary)]/20 transition-colors duration-200"
            >
              <td className="px-6 py-4 font-medium">
                {device.deviceId}
              </td>

              <td className="px-6 py-4">
                {device.temperature != null ? (
                  <span className="text-[var(--color-primary)] font-semibold">
                    {device.temperature.toFixed(2)}°C
                  </span>
                ) : (
                  "Unknown"
                )}
              </td>

              <td className="px-6 py-4 text-[var(--color-foreground)]/60">
                {device.lastSeen || "Never"}
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
    </div>
  );
}