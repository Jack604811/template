import { parseAsInteger, parseAsIsoDate, parseAsString } from "nuqs/server";
import { PAGINATION } from "@/config/constants";

export const bookingsParams = {
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),
  search: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
  startDate: parseAsIsoDate,
  endDate: parseAsIsoDate,
  collectionId: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
};
