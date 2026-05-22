"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend
);

type Props = {
  points: Array<{
    timestamp: number;
    temperature: number;
  }>;
};

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MIN_VISIBLE_WINDOW_MS = 5 * MINUTE_MS;
const ZOOM_STEP = 1.25;
const DEFAULT_Y_AXIS_MAX = 300;

const getTimeLabel = (input: number, stepMs = HOUR_MS) => {
  const date = new Date(input);

  if (isNaN(date.getTime())) {
    return "";
  }

  if (stepMs <= MINUTE_MS) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");

  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTickStepMs(visibleWindowMs: number) {
  if (visibleWindowMs <= 10 * MINUTE_MS) return MINUTE_MS;
  if (visibleWindowMs <= 20 * MINUTE_MS) return 2 * MINUTE_MS;
  if (visibleWindowMs <= 45 * MINUTE_MS) return 5 * MINUTE_MS;
  if (visibleWindowMs <= 90 * MINUTE_MS) return 10 * MINUTE_MS;
  if (visibleWindowMs <= 3 * HOUR_MS) return 15 * MINUTE_MS;
  if (visibleWindowMs <= 4 * HOUR_MS) return 20 * MINUTE_MS;
  if (visibleWindowMs <= 5 * HOUR_MS) return 30 * MINUTE_MS;
  return HOUR_MS;
}

export default function LineChart({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startWindow: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleWindowMs, setVisibleWindowMs] = useState(SIX_HOURS_MS);
  const [windowStartMs, setWindowStartMs] = useState<number | null>(null);
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);

  const tickStepMs = getTickStepMs(visibleWindowMs);
  const yMax = useMemo(() => {
    const maxTemperature = points.reduce(
      (currentMax, point) =>
        Number.isFinite(point.temperature)
          ? Math.max(currentMax, point.temperature)
          : currentMax,
      DEFAULT_Y_AXIS_MAX
    );

    return Math.max(DEFAULT_Y_AXIS_MAX, maxTemperature);
  }, [points]);

  const { xMin, xMax } = useMemo(() => {
    if (points.length === 0) {
      return {
        xMin: 0,
        xMax: SIX_HOURS_MS,
      };
    }

    const dataStart = points[0].timestamp;
    const dataEnd = points[points.length - 1].timestamp;
    const totalDuration = Math.max(dataEnd - dataStart, 0);

    if (totalDuration <= visibleWindowMs) {
      return {
        xMin: dataStart,
        xMax: dataStart + visibleWindowMs,
      };
    }

    const latestWindowStart = dataEnd - visibleWindowMs;
    const nextWindowStart =
      isFollowingLatest || windowStartMs == null
        ? latestWindowStart
        : clamp(windowStartMs, dataStart, latestWindowStart);

    return {
      xMin: nextWindowStart,
      xMax: nextWindowStart + visibleWindowMs,
    };
  }, [isFollowingLatest, points, visibleWindowMs, windowStartMs]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--color-primary").trim();
    const border = styles.getPropertyValue("--color-border").trim();
    const foreground = styles.getPropertyValue("--color-foreground").trim();

    const tickColor = hexToRgba(foreground, 0.78);
    const gridColor = hexToRgba(border, 0.8);

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(1, "transparent");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
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
        maintainAspectRatio: false,
        parsing: false,
        layout: {
          padding: {
            left: 10,
            right: 12,
            bottom: 10,
          },
        },
        interaction: {
          mode: "nearest",
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
              title: (items) => {
                const x = items[0]?.parsed?.x;
                return typeof x === "number" ? getTimeLabel(x, MINUTE_MS) : "";
              },
              label: (ctx) => {
                const y = ctx.parsed?.y;
                return y != null ? `Temperature: ${y.toFixed(2)} °C` : "";
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            border: {
              display: true,
              color: gridColor,
            },
            grid: {
              color: gridColor,
            },
            ticks: {
              color: tickColor,
              maxTicksLimit: 7,
              minRotation: 0,
              maxRotation: 0,
              callback: (value) => getTimeLabel(Number(value), tickStepMs),
            },
          },
          y: {
            min: 0,
            max: DEFAULT_Y_AXIS_MAX,
            border: {
              display: true,
              color: gridColor,
            },
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
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    chart.data.datasets[0].data = points.map((point) => ({
      x: point.timestamp,
      y: point.temperature,
    }));
    chart.options.scales!.x!.min = xMin;
    chart.options.scales!.x!.max = xMax;
    chart.options.scales!.y!.min = 0;
    chart.options.scales!.y!.max = yMax;
    (chart.options.scales!.x!.ticks as { stepSize?: number }).stepSize = tickStepMs;
    chart.update("none");
  }, [points, tickStepMs, xMax, xMin, yMax]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (points.length < 2) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWindow: xMin,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || containerWidth <= 0 || points.length < 2) return;

    const dataStart = points[0].timestamp;
    const dataEnd = points[points.length - 1].timestamp;
    const latestWindowStart = Math.max(dataStart, dataEnd - visibleWindowMs);
    const deltaRatio = (event.clientX - dragState.startX) / containerWidth;
    const nextWindowStart = clamp(
      dragState.startWindow - deltaRatio * visibleWindowMs,
      dataStart,
      latestWindowStart
    );

    setWindowStartMs(nextWindowStart);
    setIsFollowingLatest(nextWindowStart >= latestWindowStart - 1);
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    if (dragState.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function zoom(event: WheelEvent<HTMLDivElement>) {
    if (points.length === 0 || containerWidth <= 0) return;

    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    const anchorRatio = clamp(offsetX / containerWidth, 0, 1);
    const anchorTimestamp = xMin + anchorRatio * visibleWindowMs;
    const dataStart = points[0].timestamp;
    const dataEnd = points[points.length - 1].timestamp;

    const nextWindow = Math.round(
      event.deltaY > 0
        ? Math.min(SIX_HOURS_MS, visibleWindowMs * ZOOM_STEP)
        : Math.max(MIN_VISIBLE_WINDOW_MS, visibleWindowMs / ZOOM_STEP)
    );

    if (dataEnd - dataStart <= nextWindow) {
      setVisibleWindowMs(nextWindow);
      setWindowStartMs(dataStart);
      setIsFollowingLatest(true);
      return;
    }

    const latestWindowStart = dataEnd - nextWindow;
    const nextWindowStart = clamp(
      anchorTimestamp - anchorRatio * nextWindow,
      dataStart,
      latestWindowStart
    );

    setVisibleWindowMs(nextWindow);
    setWindowStartMs(nextWindowStart);
    setIsFollowingLatest(nextWindowStart >= latestWindowStart - 1);
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[180px] cursor-grab overflow-hidden select-none active:cursor-grabbing"
      style={{ touchAction: "none" }}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onWheel={zoom}
    >
      <canvas className="h-full w-full" ref={canvasRef} />
    </div>
  );
}
