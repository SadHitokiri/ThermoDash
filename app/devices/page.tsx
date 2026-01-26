export default function Devices() {
    return (
        <>
            <h1 className='text-6xl font-bold antialiased'>Devices</h1>
            <div className="p-8">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden dark:bg-neutral-700">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Device Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Temperature
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Updated
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                        <tr>
                            <td className="px-4 py-3">Sensor A</td>
                            <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                    Active
                                </span>
                            </td>
                            <td className="px-4 py-3">42</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                                2 min ago
                            </td>
                        </tr>

                        <tr>
                            <td className="px-4 py-3">Sensor B</td>
                            <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                    Offline
                                </span>
                            </td>
                            <td className="px-4 py-3">—</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                                10 min ago
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </>
    );
}
