"use client";

import Tile from "./components/Tile";
import { useDevices } from "../lib/hooks/useDevices";
import { useSensorNames } from "../lib/hooks/useSensorNames";
import LineChart from "./components/LineChart";

export default function Page() {
  const devices = useDevices();
  const { sensorNames, updateSensorName } = useSensorNames();

  return (
    <div>
      <h1 className="text-xl">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
        {Array.from(devices.values()).map((device) => {
          return (
            <Tile
              key={device.deviceId}
              title={device.lastSeen}
              device={device.deviceId}
              displayName={sensorNames.get(device.deviceId)}
              onRename={updateSensorName}
              status={
                device.temperature != null
                  ? `${device.temperature.toFixed(2)}\u00b0C`
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
