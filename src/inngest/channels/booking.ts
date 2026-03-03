import { channel, topic } from "@inngest/realtime";

export const BOOKING_CHANNEL_NAME = "booking-updates";

export const bookingChannel = channel(BOOKING_CHANNEL_NAME)
  .addTopic(
    topic("update").type<{
      bookingId: string;
      data: {
        id: string;
        [key: string]: unknown;
      };
    }>(),
  );
