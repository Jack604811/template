"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  CalendarX2Icon,
  DownloadIcon,
  FilterIcon,
  PlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, forwardRef, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { EntitySearch } from "@/components/entity-components";
import { Calendar } from "@/components/ui/calendar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { saveReturnUrl } from "@/hooks/use-detail-page-navigation";
import { capitalize, formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useSuspenseBookings } from "../hooks/use-bookings";
import { useBookingsParams } from "../hooks/use-bookings-params";
import { useSuspenseBookingsStats } from "../hooks/use-bookings-stats";
import { BookingDateBadge } from "./booking-date-badge";

type BookingItem = {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  createdAt: string | Date;
  status: string;
  total: number | null;
  customer: { name: string };
  bookable: { title: string } | null;
  payments: { amount: number; status: string }[];
};

type StatItem = { label: string; value: string };
type StatsData = {
  bookingCount: number;
  totalRevenue: number;
  collected: number;
  pending: number;
};

// ─── Stats ────────────────────────────────────────────────────────────────────

const getCountLabel = (startDate: Date, endDate: Date): string => {
  if (isToday(startDate) && isToday(endDate)) return "RESERVAS DE HOY";
  if (isSameDay(startDate, endDate)) {
    return `RESERVAS DEL ${capitalize(format(startDate, "d 'DE' MMMM", { locale: es }))}`.toUpperCase();
  }
  const start = format(startDate, "d", { locale: es });
  const end = format(endDate, "d 'DE' MMMM", { locale: es });
  return `RESERVAS DEL ${start} AL ${end}`.toUpperCase();
};

const buildStatsItems = (
  data: StatsData | undefined,
  currency: string,
  startDate: Date,
  endDate: Date,
): StatItem[] => [
  {
    label: getCountLabel(startDate, endDate),
    value: data ? String(data.bookingCount) : "—",
  },
  {
    label: "Ingresos (total)",
    value: data ? formatCurrency(data.totalRevenue, currency) : "—",
  },
  {
    label: "Recaudado",
    value: data ? formatCurrency(data.collected, currency) : "—",
  },
  {
    label: "Saldo pendiente",
    value: data ? formatCurrency(data.pending, currency) : "—",
  },
];

const useStatsItems = (): StatItem[] => {
  const { data } = useSuspenseBookingsStats();
  const [params] = useBookingsParams();
  const currency = useCurrentOrganizationWithSettings()?.currency ?? "USD";
  const startDate = params.startDate ?? new Date();
  return buildStatsItems(
    data,
    currency,
    startDate,
    params.endDate ?? startDate,
  );
};

const StatsCarousel = ({ stats }: { stats: StatItem[] }) => {
  const [i, setI] = useState(0);
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {stats[i].label}
      </p>
      <p className="text-5xl font-light tabular-nums">{stats[i].value}</p>
      <div className="flex gap-1.5">
        {stats.map((s, idx) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setI(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              idx === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
};

export const BookingsListStats = () => {
  const stats = useStatsItems();
  return (
    <div className="hidden sm:flex items-center py-5">
      {stats.map((s, idx) => (
        <Fragment key={s.label}>
          {idx > 0 && (
            <div
              className="w-px bg-border flex-shrink-0"
              style={{ height: 66 }}
            />
          )}
          <div className="flex flex-col gap-1 px-6 min-w-[160px]">
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              {s.label}
            </span>
            <span className="text-4xl font-light tabular-nums leading-none">
              {s.value}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
};

export const BookingsListStatsCarousel = () => {
  const trpc = useTRPC();
  const [params] = useBookingsParams();
  const currency = useCurrentOrganizationWithSettings()?.currency ?? "USD";
  const { data } = useQuery(
    trpc.bookings.getStats.queryOptions({
      startDate: params.startDate ?? undefined,
      endDate: params.endDate ?? undefined,
    }),
  );
  const startDate = params.startDate ?? new Date();
  return (
    <div className="sm:hidden px-4">
      <StatsCarousel
        stats={buildStatsItems(
          data,
          currency,
          startDate,
          params.endDate ?? startDate,
        )}
      />
    </div>
  );
};

// ─── Action buttons ────────────────────────────────────────────────────────────

const ActionBtn = forwardRef<
  HTMLButtonElement,
  {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    active?: boolean;
  }
>(({ icon: Icon, label, onClick, active, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className="group flex flex-col items-center gap-1.5"
    {...props}
  >
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl border transition-colors",
        active ? "bg-muted" : "bg-background hover:bg-muted",
      )}
      style={{ width: 54, height: 54 }}
    >
      <Icon className="size-5" />
      {active && (
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />
      )}
    </div>
    <span
      className={cn(
        "text-[11px] transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground group-hover:text-foreground",
      )}
    >
      {label}
    </span>
  </button>
));

// ─── Period picker ─────────────────────────────────────────────────────────────

const PeriodPicker = () => {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useBookingsParams();

  const isFiltered = params.startDate !== null;
  const range: DateRange | undefined = params.startDate
    ? { from: params.startDate, to: params.endDate ?? params.startDate }
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ActionBtn icon={CalendarIcon} label="Período" active={isFiltered} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" title="Período">
        <Calendar
          mode="range"
          selected={range}
          defaultMonth={params.startDate ?? new Date()}
          onSelect={(r) => {
            if (!r?.from) return;
            setParams({ startDate: r.from, endDate: r.to ?? r.from, page: 1 });
          }}
        />
        {isFiltered && (
          <div className="border-t px-3 py-2">
            <button
              type="button"
              onClick={() => {
                setParams({ startDate: null, endDate: null, page: 1 });
                setOpen(false);
              }}
              className="w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpiar filtro
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// ─── List ─────────────────────────────────────────────────────────────────────

const GroupLabel = ({ date }: { date: Date }) => {
  const label = isToday(date)
    ? "HOY"
    : isYesterday(date)
      ? "AYER"
      : format(date, "d 'DE' MMMM 'DE' yyyy", { locale: es }).toUpperCase();
  return (
    <p className="mb-2 mt-6 px-1 text-[11px] font-semibold tracking-widest text-muted-foreground">
      {label}
    </p>
  );
};

export const BookingsListActions = () => {
  const router = useRouter();
  const [params, setParams] = useBookingsParams();

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-center gap-4 px-4 py-4 sm:justify-start">
        <ActionBtn
          icon={PlusIcon}
          label="Nueva"
          onClick={() => router.push("/bookings/new")}
        />
        <ActionBtn icon={FilterIcon} label="Filtrar" />
        <PeriodPicker />
        <ActionBtn icon={DownloadIcon} label="Exportar" />
      </div>
      <div className="px-4 pb-3">
        <EntitySearch
          placeholder="Buscar reserva..."
          value={params.search ?? ""}
          onChange={(value) => setParams({ search: value, page: 1 })}
        />
      </div>
    </div>
  );
};

export const BookingsListItems = () => {
  const router = useRouter();
  const { data } = useSuspenseBookings();
  const currency = useCurrentOrganizationWithSettings()?.currency ?? "USD";
  const bookings = data.items as BookingItem[];

  const grouped = useMemo(() => {
    const map = new Map<string, { date: Date; items: BookingItem[] }>();
    for (const b of bookings) {
      const d = new Date(b.startTime);
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, { date: d, items: [] });
      const group = map.get(key);
      if (group) group.items.push(b);
    }
    return Array.from(map.values());
  }, [bookings]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX2Icon />
            </EmptyMedia>
            <EmptyTitle>Sin reservas</EmptyTitle>
            <EmptyDescription>
              No se encontraron reservas para el período seleccionado.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8">
      {grouped.map(({ date, items }) => (
        <div key={format(date, "yyyy-MM-dd")}>
          <GroupLabel date={date} />
          {items.map((b) => {
            const startTime = new Date(b.startTime);
            const paid = b.payments
              .filter((p) => p.status === "completed")
              .reduce((sum, p) => sum + p.amount, 0);
            const balance = (b.total ?? 0) - paid;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  saveReturnUrl("/bookings");
                  router.push(`/bookings/${b.id}`);
                }}
                className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <BookingDateBadge date={startTime} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {b.customer.name}
                  </p>
                  <p className="truncate text-sm font-medium text-primary">
                    {b.bookable?.title ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo: {formatCurrency(balance, currency)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ─── Page shell ───────────────────────────────────────────────────────────────

export const BookingsListHeader = () => (
  <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
    <SidebarTrigger />
    <span className="text-sm font-medium">Reservas</span>
  </header>
);
