import Link from "next/link";
import "./globals.css";

function NavigationBar() {
  return (
    <aside className="w-64 bg-gray-200 p-5 flex flex-col gap-6 items-center dark:bg-gray-600">
      <Link href="/" className="mb-4">
        <img src="/favicon.ico" alt="Logo" width={50} height={50} />
      </Link>

      <Link
        href="/"
        className="text-black text-lg font-bold hover:text-orange-600 dark:text-white"
      >
        Dashboard
      </Link>

      <Link
        href="/devices"
        className="text-black text-lg font-bold hover:text-orange-600 dark:text-white"
      >
        Devices
      </Link>

      <Link
        href="/statistic"
        className="text-black text-lg font-bold hover:text-orange-600 dark:text-white"
      >
        Statistic
      </Link>
    </aside>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="h-screen">
        <div className="flex h-screen">
          <NavigationBar />

          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
