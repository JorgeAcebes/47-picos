import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSession } from "./useSession";

export function useProfile(userId?: string) {
  const { session } = useSession();
  const idToFetch = userId || session?.user?.id;

  return useQuery({
    queryKey: ["profile", idToFetch],
    queryFn: async () => {
      if (!supabase || !idToFetch) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", idToFetch)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!idToFetch,
  });
}
