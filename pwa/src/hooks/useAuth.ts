import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "../supabaseClient";
import type { Empresa } from "../types";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchUserCompany = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setEmpresa(data as Empresa);
      }
    } catch (e) {
      console.error("Error fetching user company:", e);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompany(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompany(session.user.id);
      } else {
        setEmpresa(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserCompany]);

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setAuthError("Supabase client not configured.");
      setLoading(false);
      return false;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return false;
    }
    setLoading(false);
    return true;
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    companyName: string
  ) => {
    setAuthError(null);
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setAuthError("Supabase client not configured.");
      setLoading(false);
      return false;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return false;
    }

    if (data.user && companyName) {
      try {
        const { data: empData, error: empErr } = await supabase
          .from("empresas")
          .insert([
            {
              nombre: companyName,
              owner_user_id: data.user.id,
              plan_subscripcion: "pro",
            },
          ])
          .select()
          .single();

        if (!empErr && empData) {
          setEmpresa(empData as Empresa);
        }
      } catch (e) {
        console.error("Error creating company:", e);
      }
    }

    setLoading(false);
    return true;
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setEmpresa(null);
    sessionStorage.removeItem("admin_authenticated");
  };

  return {
    user,
    session,
    empresa,
    loading,
    authError,
    setAuthError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };
}
