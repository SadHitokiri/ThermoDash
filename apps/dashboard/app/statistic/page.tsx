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
      <h1>Statistic</h1>
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Rows</th>
              <th className="px-6 py-3">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {reports.map((r: any) => (
              <tr
                key={r.day}
                className="hover:bg-gray-50 transition-colors duration-200 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4">{r.day}</td>
                <td className="px-6 py-4">{r.rows}</td>
                <td className="px-6 py-4">
                  <a
                    href={`http://localhost:4000/api/report-csv?day=${r.day}`}
                    className="text-blue-500 hover:text-blue-700"
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
