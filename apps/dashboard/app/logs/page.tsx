"use client";

import { useEffect, useMemo, useState } from "react";

type LogLevel = "info" | "warn" | "error";

type LogEntry = {
  time: string;
  level: LogLevel;
  message: string;
  details?: string;
};

type LogsResponse = {
  file: string;
  entries: LogEntry[];
};

const levelOptions: Array<{ label: string; value: LogLevel | "all" }> = [
  { label: "All", value: "all" },
  { label: "Errors", value: "error" },
  { label: "Warnings", value: "warn" },
  { label: "Info", value: "info" },
];

function getLevelClassName(level: LogLevel) {
  if (level === "error") {
    return "bg-red-500/12 text-red-600 dark:text-red-300";
  }

  if (level === "warn") {
    return "bg-amber-500/14 text-amber-700 dark:text-amber-300";
  }

  return "bg-[var(--color-secondary)]/18 text-[var(--color-primary)]";
}

function formatLogTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [logFile, setLogFile] = useState("");
  const [level, setLevel] = useState<LogLevel | "all">("error");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const logsUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "300" });

    if (level !== "all") {
      params.set("level", level);
    }

    return `http://127.0.0.1:4000/api/logs?${params.toString()}`;
  }, [level]);

  async function loadLogs() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(logsUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Could not load logs");
      }

      const data = (await response.json()) as LogsResponse;
      setEntries(data.entries);
      setLogFile(data.file);
    } catch {
      setEntries([]);
      setError("Could not load logs from the local backend.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [logsUrl]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl">Logs</h1>
          {logFile && (
            <p className="mt-1 max-w-full truncate text-xs text-[var(--color-foreground)]/50">
              {logFile}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1">
            {levelOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  level === option.value
                    ? "rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-foreground)]/70 transition hover:bg-[var(--color-secondary)]/15 hover:text-[var(--color-foreground)]"
                }
                onClick={() => setLevel(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)]/80 transition hover:bg-[var(--color-secondary)]/15 hover:text-[var(--color-foreground)] disabled:opacity-50"
            onClick={loadLogs}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
        {isLoading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center text-sm font-medium text-[var(--color-foreground)]/60">
            Loading logs...
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[280px] items-center justify-center p-8 text-center text-sm font-medium text-red-500">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-8 text-center">
            <div className="text-base font-semibold text-[var(--color-foreground)]">
              No log entries found
            </div>
            <p className="mt-2 text-sm text-[var(--color-foreground)]/60">
              The selected log level has no records yet.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="min-w-full table-fixed text-left text-sm">
              <thead className="sticky top-0 bg-[var(--color-background)] text-xs uppercase tracking-wider text-[var(--color-foreground)]/70">
                <tr>
                  <th className="w-48 px-6 py-3">Time</th>
                  <th className="w-28 px-6 py-3">Level</th>
                  <th className="px-6 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {entries.map((entry, index) => (
                  <tr key={`${entry.time}-${index}`} className="align-top">
                    <td className="px-6 py-4 text-xs tabular-nums text-[var(--color-foreground)]/55">
                      {formatLogTime(entry.time)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${getLevelClassName(entry.level)}`}>
                        {entry.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="break-words font-medium text-[var(--color-foreground)]">
                        {entry.message}
                      </div>
                      {entry.details && (
                        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs text-[var(--color-foreground)]/70">
                          {entry.details}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
