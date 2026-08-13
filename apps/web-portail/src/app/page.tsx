"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPortalSessionToken } from "../lib/session";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getPortalSessionToken() ? "/portail" : "/connexion");
  }, [router]);

  return null;
}
