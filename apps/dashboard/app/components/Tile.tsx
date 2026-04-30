"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

export default function Tile({
  title,
  device,
  displayName,
  onRename,
  status,
  children,
}: {
  title: string | Date | undefined;
  device: string;
  displayName?: string;
  onRename?: (device: string, name: string) => Promise<string>;
  status?: string;
  children: ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const shownName = displayName?.trim() || device;
  const hasCustomName = Boolean(displayName?.trim());

  function startEditing() {
    setDraftName(displayName?.trim() || "");
    setError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftName("");
    setError("");
    setIsEditing(false);
    setIsSaving(false);
  }

  async function saveName(event?: FormEvent) {
    event?.preventDefault();
    if (!onRename || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      await onRename(device, draftName);
      setIsEditing(false);
      setDraftName("");
    } catch {
      setError("Could not save name");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 flex flex-col h-full transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-sm text-[var(--color-foreground)]/60">
            {title instanceof Date ? title.toLocaleString() : title}
          </h2>
          {isEditing ? (
            <form
              className="mt-1 flex min-w-0 items-center gap-2"
              onSubmit={saveName}
            >
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                autoFocus
                placeholder={device}
                className="h-8 min-w-0 max-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-sm font-semibold text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)]"
              />
              <button
                type="submit"
                title="Save"
                aria-label="Save"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? "..." : "\u2713"}
              </button>
              <button
                type="button"
                title="Cancel"
                aria-label="Cancel"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-semibold text-[var(--color-foreground)]/70 transition hover:bg-[var(--color-secondary)]/15"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                x
              </button>
              {error && (
                <span className="text-xs font-medium text-red-500">
                  {error}
                </span>
              )}
            </form>
          ) : (
            <div className="group mt-1 flex min-w-0 items-center gap-2">
              <h3 className="min-w-0 truncate text-lg font-semibold text-[var(--color-foreground)]">
                {shownName}
                {hasCustomName && (
                  <span className="ml-1 text-sm font-normal text-[var(--color-foreground)]/50">
                    ({device})
                  </span>
                )}
              </h3>
              {onRename && (
                <button
                  type="button"
                  title="Edit"
                  aria-label="Edit"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm text-[var(--color-foreground)]/45 opacity-0 transition hover:bg-[var(--color-secondary)]/15 hover:text-[var(--color-primary)] group-hover:opacity-100 focus:opacity-100"
                  onClick={startEditing}
                >
                  {"\u270e"}
                </button>
              )}
            </div>
          )}
        </div>

        {status && (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-secondary)]/20 text-[var(--color-primary)] font-medium">
            {status}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-[180px]">{children}</div>
    </div>
  );
}
