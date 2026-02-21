"use client";

import Tile from "./components/Tile";
import { useDevices } from "../lib/hooks/useDevices";
import LineChart from "./components/LineChart";
import { Children } from "react";

export default function Page() {
  const devices = useDevices();

  return (
    <div>
      <h1 className="text-6xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] auto-rows-fr gap-6 p-8">
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
              <LineChart value={device.temperature || null} lastSeen={device.lastSeen || null} />
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
