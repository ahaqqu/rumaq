import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocations, createLocation, deleteLocation } from "../api.js";

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
