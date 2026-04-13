"use client";

import { useEffect, useState } from "react";

let cachedToken: string | null = null;
let cachedHasAccess: boolean | null = null;
let inflightCheck: Promise<boolean> | null = null;

async function checkVmInchargeAccess(accessToken: string): Promise<boolean> {
  if (cachedToken === accessToken && cachedHasAccess !== null) {
    return cachedHasAccess;
  }

  if (inflightCheck) {
    return inflightCheck;
  }

  inflightCheck = (async () => {
    try {
      const res = await fetch("/api/attendance/virtual-machine", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      const hasAccess = !!(res.ok && data?.machine);
      cachedToken = accessToken;
      cachedHasAccess = hasAccess;
      return hasAccess;
    } catch {
      return false;
    } finally {
      inflightCheck = null;
    }
  })();

  return inflightCheck;
}

export function useVmInchargeAccess(session: any) {
  const [hasVmInchargeAccess, setHasVmInchargeAccess] = useState(false);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setHasVmInchargeAccess(false);
      return;
    }

    checkVmInchargeAccess(token).then((hasAccess) => {
      setHasVmInchargeAccess(hasAccess);
    });
  }, [session?.access_token]);

  return hasVmInchargeAccess;
}
