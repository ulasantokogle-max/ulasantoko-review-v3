"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type BusinessContextItem = {
  business_id: string;
  business_name: string;
  display_name: string;
  category: string | null;
  organization_id: string;
};

export function useBusinessContext(userEmail: string | null, preferBusinessFromUrl = false) {
  const [businesses, setBusinesses] = useState<BusinessContextItem[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState("");

  useEffect(() => {
    if (!userEmail) {
      setBusinesses([]);
      setBusinessId(null);
      setBusinessError("");
      return;
    }

    loadBusinesses();
  }, [userEmail, preferBusinessFromUrl]);

  async function loadBusinesses() {
    setBusinessLoading(true);
    setBusinessError("");

    const { data, error } = await supabase.rpc("v3_get_my_businesses");

    setBusinessLoading(false);

    if (error) {
      setBusinessError(error.message);
      setBusinesses([]);
      setBusinessId(null);
      return;
    }

    const rows = (data ?? []) as BusinessContextItem[];
    const requestedId = preferBusinessFromUrl && typeof window !== "undefined" && window.location?.href
      ? new URL(window.location.href).searchParams.get("business_id")
      : null;
    setBusinesses(rows);
    setBusinessId((current) => {
      // URL selection only applies to businesses returned for the signed-in user.
      if (requestedId && rows.some((item) => item.business_id === requestedId)) {
        return requestedId;
      }
      if (current && rows.some((item) => item.business_id === current)) {
        return current;
      }
      return rows[0]?.business_id ?? null;
    });
  }

  return {
    businesses,
    businessId,
    setBusinessId,
    businessLoading,
    businessError,
    reloadBusinesses: loadBusinesses,
  };
}
