"use client";

import Tile from "./components/Tile";
import { useDevices } from "../lib/hooks/useDevices";
import { useSensorNames } from "../lib/hooks/useSensorNames";
import { applyTemperatureCalibration } from "../lib/calibration";
import LineChart from "./components/LineChart";

export default function Page() {
  const devices = useDevices();
  const {
    sensorNames,
    sensorCalibrations,
    updateSensorName,
    updateSensorCalibration,
  } = useSensorNames();

  return (
    <div>
      <h1 className="text-xl">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
        {Array.from(devices.values()).map((device) => {
          const calibrationExpression = sensorCalibrations.get(device.deviceId);
          const temperature =
            device.temperature != null
              ? applyTemperatureCalibration(device.temperature, calibrationExpression)
              : null;

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
              <LineChart value={temperature || 0} lastSeen={device.lastSeen || "Never"} />
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
