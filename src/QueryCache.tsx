import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import type { PropsWithChildren } from "react";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

export default function QueryCacheProvider({ children }: PropsWithChildren) {
  const idbKey: IDBValidKey = `${location.pathname} contributions`;
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 6 hours
        staleTime: 1000 * 60 * 60 * 6,
        // Keep unused data in cache for 24 hours
        gcTime: 1000 * 60 * 60 * 24,
        // Retry failed requests once
        retry: 1,
        // Don't refetch on window focus (contributions don't change that often)
        refetchOnWindowFocus: false,
      },
    },
  });

  const options = {
    persister: {
      persistClient: async (client: PersistedClient) => {
        await set(idbKey, client);
      },
      restoreClient: async () => {
        return await get<PersistedClient>(idbKey);
      },
      removeClient: async () => {
        await del(idbKey);
      },
    } as Persister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // Keep cache for 7 days
  };

  return (
    <PersistQueryClientProvider client={client} persistOptions={options}>
      {children}
    </PersistQueryClientProvider>
  );
}
