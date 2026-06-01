"use client";

import { useEffect, useState } from "react";

type UpdateStatus = {
  state:
    | "idle"
    | "checking"
    | "available"
    | "downloading"
    | "downloaded"
    | "unavailable"
    | "error";
  updateAvailable: boolean;
  version: string | null;
  progress?: number;
  error: string | null;
};

function getButtonText(status: UpdateStatus) {
  if (status.state === "downloaded") return "Install update";
  if (status.state === "downloading") return `Downloading ${status.progress ?? 0}%`;
  if (status.state === "checking") return "Checking...";
  return "Update";
}

export default function UpdateButton() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    const updates = window.api?.updates;
    if (!updates) return;

    let isMounted = true;

    updates.getStatus().then((nextStatus) => {
      if (isMounted) {
        setStatus(nextStatus);
      }
    });

    const unsubscribe = updates.onStatus((nextStatus) => {
      setStatus(nextStatus);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (!status?.updateAvailable) return null;

  const isBusy = status.state === "checking" || status.state === "downloading";

  async function handleClick() {
    const updates = window.api?.updates;
    if (!updates || isBusy) return;

    setStatus(await updates.install());
  }

  return (
    <button
      type="button"
      className="mb-3 w-full rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-60"
      onClick={handleClick}
      disabled={isBusy}
      title={status.version ? `Version ${status.version}` : undefined}
    >
      {getButtonText(status)}
    </button>
  );
}
