export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  if (isSameDay(date, now)) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Ayer";

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  if (date > sevenDaysAgo) {
    return date.toLocaleDateString("es", { weekday: "long" });
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium capitalize text-muted-foreground shadow-sm backdrop-blur-sm">
        {formatDate(date)}
      </span>
    </div>
  );
}
