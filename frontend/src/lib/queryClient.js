import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'

// Bump when the cached data shape changes incompatibly.
const CACHE_BUSTER = '1'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
})

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: idbGet,
    setItem: idbSet,
    removeItem: idbDel,
  },
})

export const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24,
  buster: CACHE_BUSTER,
}
