import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import type { PropsWithChildren } from "react";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

export default function QueryCacheProvider({ children }: PropsWithChildren) {
  // FIXME: does the cache maxAge need to be more than staleTime/gcTime?
  const maxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
  const idbKey: IDBValidKey = `${location.pathname} contributions`;
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: maxAge,
        gcTime: maxAge,
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
    maxAge,
  };

  return (
    <PersistQueryClientProvider client={client} persistOptions={options}>
      {children}
    </PersistQueryClientProvider>
  );
}
