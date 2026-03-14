"use client";

import { useDevices } from "@/lib/hooks/useDevices";

export default function Devices() {
  const devices = useDevices();
  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th className="px-6 py-3">Device ID</th>
            <th className="px-6 py-3">Temperature</th>
            <th className="px-6 py-3">Last Seen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {Array.from(devices.values()).map((device) => (
            <tr key={device.deviceId} className="hover:bg-gray-50 transition-colors duration-200 dark:hover:bg-gray-700">
              <td className="px-6 py-4">{device.deviceId}</td>
              <td className="px-6 py-4">
                {device.temperature != null
                  ? `${device.temperature.toFixed(2)}°C`
                  : "Unknown"}
              </td>
              <td className="px-6 py-4 text-gray-500">{device.lastSeen || "Never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
