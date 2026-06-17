import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";

export const useBookablesParams = () => {
  return useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(10),
      search: parseAsString.withDefault(""),
      collectionId: parseAsString,
    },
    {
      history: "push",
      shallow: false,
    },
  );
};

