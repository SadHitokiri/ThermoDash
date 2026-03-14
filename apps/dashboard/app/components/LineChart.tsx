"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

type Props = {
  value: number;
  lastSeen: string;
};

const MAX_POINTS = 500;

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
            borderColor: "rgba(244, 118, 34, 1)",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          mode: "point",
          intersect: true,
        },
        animation: false,
        plugins: {
          tooltip: {
            enabled: true,
          },
        },
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

  return <canvas className="w-full h-full" ref={canvasRef} />;
}
