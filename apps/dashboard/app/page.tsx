"use client";

import Tile from "./components/Tile";
import { useDevices } from "../lib/hooks/useDevices";
import LineChart from "./components/LineChart";

export default function Page() {
  const devices = useDevices();

  return (
    <div>
      <h1 className="text-6xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
        {Array.from(devices.values()).map((device) => {
          return (
            <Tile
              key={device.deviceId}
              title={device.lastSeen}
              device={device.deviceId}
              status={
                device.temperature
                  ? `${device.temperature.toFixed(2)}°C`
                  : "Unknown"
              }
            >
              <LineChart value={device.temperature || 0} lastSeen={device.lastSeen || "Never"} />
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
