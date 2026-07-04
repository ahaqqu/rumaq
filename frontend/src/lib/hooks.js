import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSettings, updateSettings,
  getLocations, createLocation, deleteLocation,
  getStores, createStore, deleteStore,
  getAiUsage, testAiKey,
} from './api.js'

export function useSettingsQuery() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useLocationsQuery() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
  })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (label) => createLocation(label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteLocation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
  })
}

export function useStoresQuery() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  })
}

export function useCreateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (label) => createStore(label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export function useDeleteStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteStore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export function useAiUsageQuery() {
  return useQuery({
    queryKey: ['aiUsage'],
    queryFn: getAiUsage,
  })
}

export function useTestAiKey() {
  return useMutation({
    mutationFn: testAiKey,
  })
}