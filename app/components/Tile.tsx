export default function Tile({
  title,
  device,
  children,
}: {
  title: string;
  device: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col dark:bg-neutral-700">
      <div className="flex text-lg font-semibold mb-2 justify-around dark:text-white">
        <h2>{title}</h2>
        <h2>{device}</h2>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
