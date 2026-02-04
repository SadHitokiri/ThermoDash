"use client";

import { useEffect, useRef } from "react";
import {Chart, ChartType} from "chart.js/auto";

export default function LineChart({
  name,
  xData,
  yData,
}: {
  name: string;
  xData: any;
  yData: any;
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let labels = yData;
    let data = {
      labels: labels,
      datasets: [
        {
          label: "°C",
          data: xData,
          borderColor: "blue",
        },
      ],
    };

    const config = {
      type: "line" as ChartType,
      data: data,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: name,
          },
        },
      },
    };

    const chart = new Chart(canvasRef.current, config);
  }, []);

  return <canvas ref={canvasRef} />;
}
