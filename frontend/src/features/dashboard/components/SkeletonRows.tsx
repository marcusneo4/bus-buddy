export function SkeletonRows({ count = 7 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/80 p-3"
        >
          <div className="skeleton h-7 w-12 rounded-md shrink-0" />
          <div className="flex flex-1 gap-2">
            <div className="skeleton h-4 w-10 rounded" />
            <div className="skeleton h-4 w-10 rounded opacity-60" />
            <div className="skeleton h-4 w-10 rounded opacity-40" />
          </div>
          <div className="skeleton h-7 w-16 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
