import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/backend/account.functions";
import { isManagerRole } from "@/features/roles";
import type { Profile } from "@/shared/types";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      // If the user returned from a Supabase magic-link / OAuth redirect,
      // process the URL so the client stores the session. getSessionFromUrl
      // parses the URL fragment and persists the session to localStorage.
      try {
        if (typeof window !== "undefined") {
          const shouldProcessUrl =
            window.location.hash.includes("access_token") ||
            window.location.href.includes("type=signup") ||
            window.location.search.includes("provider");
          if (shouldProcessUrl && supabase.auth.getSessionFromUrl) {
            // storeSession: true ensures the session is persisted by the client
            await supabase.auth.getSessionFromUrl({ storeSession: true }).catch(() => {});
            // Remove token fragments from the URL for cleanliness/security
            const { protocol, host, pathname, search } = window.location;
            window.history.replaceState(
              {},
              document.title,
              `${protocol}//${host}${pathname}${search}`,
            );
          }
        }
      } catch (e) {
        console.warn("Error processing Supabase redirect URL", e);
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setReady(true);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, ready };
}

export function useProfile() {
  const { session, ready } = useSession();

  const query = useQuery<Profile>({
    queryKey: ["profile", session?.user.id ?? null],
    queryFn: () => getMyProfile(),
    enabled: ready && !!session,
    staleTime: 60_000,
  });

  return {
    session,
    ready,
    profile: query.data ?? null,
    isManager: isManagerRole(query.data?.role),
    loading: !ready || query.isLoading,
  };
}
