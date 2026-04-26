export default function Tile({
  title,
  device,
  status,
  children,
}: {
  title: string | Date | undefined;
  device: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 flex flex-col h-full transition-all duration-200 hover:shadow-lg">
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h2 className="text-sm text-[var(--color-foreground)]/60">
            {title instanceof Date ? title.toLocaleString() : title}
          </h2>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            {device}
          </h3>
        </div>

        {status && (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-secondary)]/20 text-[var(--color-primary)] font-medium">
            {status}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-[180px]">
        {children}
      </div>
    </div>
  );
}