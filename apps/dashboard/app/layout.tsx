"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./globals.css";

function FaviconSwitcher() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateFavicon = () => {
      const link =
        document.querySelector<HTMLLinkElement>("link[rel~='icon']") ||
        document.createElement("link");

      link.rel = "icon";
      link.href = media.matches ? "/favicon-dark.ico" : "/favicon-light.ico";

      document.head.appendChild(link);
    };

    updateFavicon();
    media.addEventListener("change", updateFavicon);

    return () => media.removeEventListener("change", updateFavicon);
  }, []);

  return null;
}

function Logo() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const update = () => setIsDark(media.matches);
    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Link href="/" className="flex items-center justify-center group">
      <img
        src={isDark ? "/logo.png" : "/logo-2.png"}
        alt="Logo"
        width={50}
        height={50}
        className="transition-transform duration-300 group-hover:scale-110"
      />
    </Link>
  );
}

function NavigationBar() {
  return (
    <aside className="w-64 bg-[var(--color-card)] border-r border-[var(--color-border)] p-6 flex flex-col gap-6">
      <Logo />

      <nav className="flex flex-col gap-2 mt-4">
        <Link
          href="/"
          className="px-4 py-2 rounded-xl font-medium text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]/15 transition-all duration-200"
        >
          Dashboard
        </Link>

        <Link
          href="/devices"
          className="px-4 py-2 rounded-xl font-medium text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]/15 transition-all duration-200"
        >
          Devices
        </Link>

        <Link
          href="/statistic"
          className="px-4 py-2 rounded-xl font-medium text-[var(--color-foreground)]/80 hover:text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]/15 transition-all duration-200"
        >
          Statistic
        </Link>
      </nav>

      <div className="mt-auto pt-4 border-t border-[var(--color-border)] text-xs text-center space-y-1 text-[var(--color-foreground)]/50">
        <p>
          Built by{" "}
          <span className="text-[var(--color-foreground)]/70">
            Dmitrijs Sinickis
          </span>
          . Demo version with limited features.
        </p>
        <p>
          <a
            href="mailto:dmitrijs.sinickis@gmail.com"
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            dmitrijs.sinickis@gmail.com
          </a>
        </p>
      </div>
    </aside>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <title>ThermoDash</title>
      </head>
      <body className="h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
        <FaviconSwitcher />
        <div className="flex h-screen">
          <NavigationBar />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
