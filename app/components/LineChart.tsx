"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
);

type Props = {
  value: number | null;
  lastSeen: string | null;
};

const MAX_POINTS = 5000;

export default function LineChart({ value, lastSeen }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature °C",
            data: [],
            borderColor: "rgb(75,192,192)",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || value == null) return;

    const chart = chartRef.current;
    const time = lastSeen;

    chart.data.labels?.push(time);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels!.length > MAX_POINTS) {
      chart.data.labels!.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update();
  }, [value]);

  return <canvas ref={canvasRef} />;
}
