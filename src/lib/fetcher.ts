import { useRegistry } from "@/registry";
import { createFetcher, HttpStatus } from "vovk";

export const fetcher = createFetcher<{ bypassRegistry?: boolean }>({
  transformResponse: async (data, { bypassRegistry }) => {
    if (bypassRegistry) {
      return data;
    }
    const state = useRegistry.getState();
    if (
      data &&
      typeof data === "object" &&
      Symbol.asyncIterator in data &&
      "onIterate" in data &&
      typeof data.onIterate === "function"
    ) {
      data.onIterate(state.parse); // handle each item in the async iterable
      return data;
    }

    state.parse(data); // parse regular JSON data
    return data;
  },
  onError: (error) => {
    if (error.statusCode === HttpStatus.UNAUTHORIZED) {
      document.location.href = "/login";
    }
  },
});
