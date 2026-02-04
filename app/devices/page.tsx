"use client";

import { useDevices } from "@/lib/hooks/useDevices";
import Table from "../components/Table";

export default function Devices() {
  const devices = useDevices();
  {
    Array.from(devices.values()).map((device) => {
      return (
        <Table title={device.deviceId}/>
      );
    });
  }
}
