"use client";

import { useState } from "react";

type Props = {
  day: string;
};

export default function DownloadExcelButton({ day }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadReport() {
    if (isDownloading) return;

    setIsDownloading(true);
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:4000/api/report-xlsx?day=${encodeURIComponent(day)}&downloadAt=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `report-${day}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="text-[var(--color-primary)] font-medium hover:opacity-80 transition disabled:opacity-50"
        onClick={downloadReport}
        disabled={isDownloading}
      >
        {isDownloading ? "Downloading..." : "Download Excel"}
      </button>
      {error && (
        <span className="text-xs font-medium text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}
