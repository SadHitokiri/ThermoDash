export default function Tile({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>

      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
