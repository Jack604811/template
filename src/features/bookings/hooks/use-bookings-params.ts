import { useQueryStates } from "nuqs";
import { bookingsParams } from "../params";

export const useBookingsParams = () => {
  return useQueryStates(bookingsParams);
};

