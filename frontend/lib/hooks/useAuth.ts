"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isAuthDisabled, subscribeToAuth } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: !isAuthDisabled(),
  });

  useEffect(() => {
    if (isAuthDisabled()) return;
    return subscribeToAuth((user) => setState({ user, loading: false }));
  }, []);

  return state;
}
