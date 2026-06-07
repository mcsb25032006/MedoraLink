"use client";

import { useEffect, useState } from "react";

export type CurrentUser = { id: number; email: string; role: "patient" | "doctor" } | null;

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("medoralink:user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (u: CurrentUser) => {
    setUser(u);
    try {
      if (u) localStorage.setItem("medoralink:user", JSON.stringify(u));
      else localStorage.removeItem("medoralink:user");
    } catch {}
  };

  return { user, setUser: save };
}
