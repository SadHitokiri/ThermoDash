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

const getTimeLabel = (input: number) => {
  const date = new Date(input);

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MIN_VISIBLE_WINDOW_MS = 5 * MINUTE_MS;
const ZOOM_STEP = 1.25;

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");

  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function LineChart({ points }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);
  const isAtEndRef = useRef(true);
  const dragStateRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
  const zoomAnchorRef = useRef<{ timestamp: number; offsetX: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [visibleWindowMs, setVisibleWindowMs] = useState(SIX_HOURS_MS);

  const tickStepMs =
    visibleWindowMs <= 15 * MINUTE_MS
      ? MINUTE_MS
      : visibleWindowMs <= 60 * MINUTE_MS
        ? 5 * MINUTE_MS
        : visibleWindowMs <= 3 * HOUR_MS
          ? 30 * MINUTE_MS
          : HOUR_MS;

  const { contentWidth, xMin, xMax } = useMemo(() => {
    if (points.length === 0) {
      return {
        contentWidth: viewportWidth,
        xMin: 0,
        xMax: SIX_HOURS_MS,
      };
    }

    const firstTimestamp = points[0].timestamp;
    const lastTimestamp = points[points.length - 1].timestamp;
    const visibleDuration = Math.max(lastTimestamp - firstTimestamp, visibleWindowMs);

    return {
      contentWidth: Math.max(
        viewportWidth,
        Math.ceil((visibleDuration / visibleWindowMs) * viewportWidth)
      ),
      xMin: firstTimestamp,
      xMax: firstTimestamp + visibleDuration,
    };
  }, [points, viewportWidth, visibleWindowMs]);

  useEffect(() => {
    if (!scrollRef.current) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });

    resizeObserver.observe(scrollRef.current);

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
            label: "Temperature \u00b0C",
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
                return typeof x === "number" ? getTimeLabel(x) : "";
              },
              label: (ctx) => {
                const y = ctx.parsed?.y;
                return y != null ? `Temperature: ${y.toFixed(2)}\u00b0C` : "";
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            grid: {
              display: false,
            },
            ticks: {
              color: tickColor,
              stepSize: HOUR_MS,
              maxTicksLimit: 7,
              callback: (value) => getTimeLabel(Number(value)),
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
    (chart.options.scales!.x!.ticks as { stepSize?: number }).stepSize = tickStepMs;

    chart.update("none");
  }, [points, xMin, xMax, tickStepMs]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    const zoomAnchor = zoomAnchorRef.current;

    if (scrollElement && zoomAnchor) {
      const totalDuration = xMax - xMin || visibleWindowMs;
      const anchorRatio = (zoomAnchor.timestamp - xMin) / totalDuration;
      scrollElement.scrollLeft = anchorRatio * scrollElement.scrollWidth - zoomAnchor.offsetX;
      zoomAnchorRef.current = null;
      updateIsAtEnd();
      return;
    }

    if (!scrollElement || !isAtEndRef.current) return;

    scrollElement.scrollLeft = scrollElement.scrollWidth;
  }, [contentWidth, points.length, visibleWindowMs, xMin, xMax]);

  function updateIsAtEnd() {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    isAtEndRef.current =
      scrollElement.scrollLeft + scrollElement.clientWidth >= scrollElement.scrollWidth - 8;
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scrollElement.scrollLeft,
    };
    scrollElement.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const scrollElement = scrollRef.current;
    const dragState = dragStateRef.current;
    if (!scrollElement || !dragState) return;

    scrollElement.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.startX);
    updateIsAtEnd();
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    const scrollElement = scrollRef.current;
    const dragState = dragStateRef.current;
    if (!scrollElement || !dragState) return;

    if (dragState.pointerId === event.pointerId) {
      dragStateRef.current = null;
      scrollElement.releasePointerCapture(event.pointerId);
    }
  }

  function zoom(event: WheelEvent<HTMLDivElement>) {
    const scrollElement = scrollRef.current;
    if (!scrollElement || viewportWidth === 0) return;

    event.preventDefault();

    const bounds = scrollElement.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    const totalDuration = xMax - xMin || visibleWindowMs;
    const anchorTimestamp =
      xMin + ((scrollElement.scrollLeft + offsetX) / scrollElement.scrollWidth) * totalDuration;

    zoomAnchorRef.current = {
      timestamp: anchorTimestamp,
      offsetX,
    };

    setVisibleWindowMs((current) => {
      const next =
        event.deltaY > 0
          ? Math.min(SIX_HOURS_MS, current * ZOOM_STEP)
          : Math.max(MIN_VISIBLE_WINDOW_MS, current / ZOOM_STEP);

      return Math.round(next);
    });
  }

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-[180px] cursor-grab overflow-x-auto overflow-y-hidden active:cursor-grabbing"
      onScroll={updateIsAtEnd}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onWheel={zoom}
    >
      <div className="h-full min-h-[180px]" style={{ width: contentWidth || "100%" }}>
        <canvas className="h-full w-full" ref={canvasRef} />
      </div>
    </div>
  );
}
