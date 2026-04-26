async function getReports() {
  const res = await fetch("http://localhost:4000/api/reports", {
    cache: "no-store",
  });

  return res.json();
}

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div className="space-y-6">
      <h1 className="text-xl">
        Statistic
      </h1>

      <div className="bg-[var(--color-card)] shadow-lg rounded-2xl overflow-hidden border border-[var(--color-border)]">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[var(--color-background)] text-[var(--color-foreground)]/70 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Rows</th>
              <th className="px-6 py-3">Download</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-border)]">
            {reports.map((r: any) => (
              <tr
                key={r.day}
                className="hover:bg-[var(--color-secondary)]/20 transition-colors duration-200"
              >
                <td className="px-6 py-4 font-medium">
                  {r.day}
                </td>

                <td className="px-6 py-4 text-[var(--color-foreground)]/80">
                  {r.rows}
                </td>

                <td className="px-6 py-4">
                  <a
                    href={`http://localhost:4000/api/report-csv?day=${r.day}`}
                    className="text-[var(--color-primary)] font-medium hover:opacity-80 transition"
                  >
                    Download CSV
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}