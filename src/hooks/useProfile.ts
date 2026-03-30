"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useProfile(session: any) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        // Fallback for missing profile
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .upsert({ id: userId, email: session?.user?.email, role: 6 }, { onConflict: 'id' })
          .select()
          .maybeSingle();
        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (err: any) {
      console.error("Profile useHook error:", err.message || err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile(session.user.id);
    } else {
      setLoading(false);
    }
  }, [session?.user?.id, fetchProfile]);

  return { profile, loading, error, refreshProfile: () => session?.user?.id && fetchProfile(session.user.id) };
}
