export default function Statistic() {
  return (
    <>
      <h1 className="text-6xl font-bold antialiased">Statistic</h1>
      <div className="p-8">
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden dark:bg-neutral-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                File
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3">Today</td>
              <td className="px-4 py-3">
                <button>
                  <a
                    href="public/reports/report.txt"
                    download
                    className="text-blue-600 hover:underline"
                  >
                    Download
                  </a>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
