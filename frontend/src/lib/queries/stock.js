import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStock, patchStock } from '../api.js'

export function useStock({ location, q } = {}) {
  return useQuery({
    queryKey: ['stock', { location, q }],
    queryFn: () => getStock({ location, q }),
  })
}

export function useUpdateStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => patchStock(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['home'] })
    },
  })
}
