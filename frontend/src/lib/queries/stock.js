import { useQuery } from '@tanstack/react-query'
import { getStock } from '../api.js'

export function useStock({ location, q } = {}) {
  return useQuery({
    queryKey: ['stock', { location, q }],
    queryFn: () => getStock({ location, q }),
  })
}
