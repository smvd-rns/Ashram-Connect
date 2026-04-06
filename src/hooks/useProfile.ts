"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useProfile(session: any) {
  const [profile, setProfile] = useState<any>(null);
  const [isBcdb, setIsBcdb] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const checkBcdb = async (email: string, role?: number) => {
        if (!email) return;

        // Admin override
        if (role === 1) {
          setIsBcdb(true);
          return;
        }

        try {
          const res = await fetch(`/api/auth/bcdb-check?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          setIsBcdb(!!data.isBcdb);
        } catch (err) {
          console.error("BCDB Check API Error:", err);
          setIsBcdb(false);
        }
      };

      // 1. Try fetching by exact ID
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setProfile(data);
        await checkBcdb(data.email || session?.user?.email, data.role);
        setLoading(false);
        return;
      }

      // 2. No profile by ID. Check if an unlinked profile exists with this email (Pre-filled from BCDB)
      if (session?.user?.email) {
        const { data: emailMatch, error: emailError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", session.user.email)
          .maybeSingle();

        if (emailError) throw emailError;

        if (emailMatch) {
          // CLAIM THE PROFILE: Update the existing profile with the new auth ID
          const { data: updatedProfile, error: claimError } = await supabase
            .from("profiles")
            .update({ id: userId, updated_at: new Date().toISOString() })
            .eq("email", session.user.email)
            .select()
            .single();

          if (claimError) throw claimError;
          
          setProfile(updatedProfile);
          await checkBcdb(updatedProfile.email || session?.user?.email, updatedProfile.role);
          setLoading(false);
          return;
        }
      }

      // 3. Fallback: Create a new blank profile if none exists by ID or Email
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .upsert({ 
          id: userId, 
          email: session?.user?.email, 
          role: 6,
          full_name: session?.user?.user_metadata?.full_name || "",
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .single();
        
      if (createError) throw createError;
      setProfile(newProfile);
      await checkBcdb(newProfile.email || session?.user?.email, newProfile.role);

    } catch (err: any) {
      console.error("Profile Hook Error:", err.message || err);
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

  return { profile, isBcdb, loading, error, refreshProfile: () => session?.user?.id && fetchProfile(session.user.id) };
}
