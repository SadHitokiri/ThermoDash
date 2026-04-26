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
  Legend,
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

const getTimeLabel = (input: string) => {
  const d = new Date(input);

  if (isNaN(d.getTime())) {
    return input;
  }

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");

  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function LineChart({ value, lastSeen }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--color-primary").trim();
    const border = styles.getPropertyValue("--color-border").trim();
    const foreground = styles.getPropertyValue("--color-foreground").trim();

    const tickColor = hexToRgba(foreground, 0.7);
    const gridColor = hexToRgba(border, 0.6);

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(1, "transparent");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature °C",
            data: [],
            borderColor: primary,
            backgroundColor: gradient,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          mode: "index",
          intersect: false,
        },
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            displayColors: false,
            padding: 8,
            callbacks: {
              label: (ctx) => {
                const y = ctx.parsed?.y;
                return y != null ? `${y.toFixed(2)}°C` : "";
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: tickColor,
              maxTicksLimit: 6,
            },
          },
          y: {
            grid: {
              color: gridColor,
            },
            ticks: {
              color: tickColor,
            },
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
    const time = getTimeLabel(lastSeen || "");

    chart.data.labels?.push(time);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels!.length > MAX_POINTS) {
      chart.data.labels!.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update("none");
  }, [value, lastSeen]);

  return <canvas className="w-full h-full" ref={canvasRef} />;
}