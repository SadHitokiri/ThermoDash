"use client";

import { useEffect, useState } from "react";
import DownloadExcelButton from "./DownloadExcelButton";

type Report = { day: string; rows: number };
type Response = {
  reports: Report[];
  pagination: { page: number; totalPages: number; totalDays: number };
  retention: { deletesAt: string; rows: number } | null;
};

const PAGE_SIZE = 14;

export default function ReportsTable() {
  const [data, setData] = useState<Response | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadReports() {
      setError("");
      try {
        const response = await fetch(`http://127.0.0.1:4000/api/reports?page=${page}&pageSize=${PAGE_SIZE}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Failed to load statistics");
        setData(await response.json());
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Failed to load statistics");
      }
    }
    void loadReports();
    return () => controller.abort();
  }, [page]);

  const deletionDate = data?.retention
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.retention.deletesAt))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl">Statistic</h1>
        <p className="mt-1 text-sm text-[var(--color-foreground)]/70">Measurements are retained for 30 days.</p>
      </div>
      {data?.retention && deletionDate && (
        <div className="rounded-xl border border-amber-400/50 bg-amber-100/60 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          {data.retention.rows} measurement{data.retention.rows === 1 ? "" : "s"} will be deleted on {deletionDate} because they are more than 30 days old.
        </div>
      )}
      <div className="bg-[var(--color-card)] shadow-lg rounded-2xl overflow-hidden border border-[var(--color-border)]">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[var(--color-background)] text-[var(--color-foreground)]/70 uppercase text-xs tracking-wider"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Rows</th><th className="px-6 py-3">Download</th></tr></thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {data?.reports.map((report) => (
              <tr key={report.day} className="hover:bg-[var(--color-secondary)]/20 transition-colors duration-200"><td className="px-6 py-4 font-medium">{report.day}</td><td className="px-6 py-4 text-[var(--color-foreground)]/80">{report.rows}</td><td className="px-6 py-4"><DownloadExcelButton day={report.day} /></td></tr>
            ))}
          </tbody>
        </table>
        {!data && !error && <p className="px-6 py-6 text-sm text-[var(--color-foreground)]/70">Loading statistics…</p>}
        {data?.reports.length === 0 && <p className="px-6 py-6 text-sm text-[var(--color-foreground)]/70">No statistics for the selected period.</p>}
        {error && <p className="px-6 py-6 text-sm text-red-500">{error}</p>}
      </div>
      {data && data.pagination.totalPages > 1 && (
        <nav className="flex items-center justify-between gap-4" aria-label="Statistics pages">
          <button type="button" className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Newer</button>
          <span className="text-sm text-[var(--color-foreground)]/70">Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalDays} days)</span>
          <button type="button" className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={page >= data.pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Older</button>
        </nav>
      )}
    </div>
  );
}
