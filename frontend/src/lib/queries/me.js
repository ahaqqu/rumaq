import { useQuery, useMutation } from '@tanstack/react-query'
import { getMe, logout as apiLogout } from '../api.js'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

export function useMeQueryOptions() {
  return {
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    staleTime: 1000 * 60 * 5,
  }
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      apiLogout()
    },
  })
}
