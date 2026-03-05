"use client";

import {
  EntityContainer,
  EntityHeader,
  EntityList,
  EntityPagination,
  EntitySearch,
  EntityItem,
  EmptyView,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { useSuspenseBookings } from "@/features/bookings/hooks/use-bookings";
import { useBookingsParams } from "@/features/bookings/hooks/use-bookings-params";
import { useRemoveBooking } from "@/features/bookings/hooks/use-bookings";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useEntitySearch } from "@/hooks/use-entity-search";

export const BookingsSearch = () => {
  const [params, setParams] = useBookingsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search bookings..."
    />
  );
};

export const BookingsList = () => {
  const bookingsQuery = useSuspenseBookings();
  const removeBooking = useRemoveBooking();

  const handleRemove = async (id: string) => {
    await removeBooking.mutateAsync({ id });
  };

  return (
    <EntityList
      items={bookingsQuery.data.items}
      getKey={(booking) => booking.id}
      renderItem={(booking) => (
        <EntityItem
          href={`/bookings/${booking.id}`}
          title={`Booking #${booking.id.slice(0, 8)}`}
          subtitle={format(new Date(booking.startTime), "PPP p")}
          onRemove={() => handleRemove(booking.id)}
        />
      )}
      emptyView={<BookingsEmpty />}
    />
  );
};

export const BookingsHeader = ({ disabled }: { disabled?: boolean }) => {
  const router = useRouter();

  const handleCreate = () => {
    router.push("/bookings/new");
  };

  return (
    <EntityHeader
      title="Bookings"
      description="Manage your bookings"
      onNew={handleCreate}
      newButtonLabel="New Booking"
      disabled={disabled}
    />
  );
};

export const BookingsPagination = () => {
  const bookings = useSuspenseBookings();
  const [params, setParams] = useBookingsParams();

  return (
    <EntityPagination
      disabled={bookings.isFetching}
      totalPages={bookings.data.totalPages}
      page={bookings.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const BookingsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<BookingsHeader />}
      search={<BookingsSearch />}
      pagination={<BookingsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const BookingsLoading = () => {
  return <LoadingView message="Loading bookings..." />;
};

export const BookingsError = () => {
  return <ErrorView message="Error loading bookings" />;
};

export const BookingsEmpty = () => {
  const router = useRouter();

  return (
    <EmptyView
      onNew={() => router.push("/bookings/new")}
      message="You haven't created any bookings yet. Get started by creating your first booking"
    />
  );
};

