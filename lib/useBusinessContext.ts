"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type BusinessContextItem = {
  business_id: string;
  business_name: string;
  display_name: string;
  category: string | null;
  organization_id: string;
};

export function useBusinessContext(userEmail: string | null, preferBusinessFromUrl = false) {
  const [rows, setRows] = useState<BusinessContextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [businessError, setBusinessError] = useState("");
  const currentAccount = useRef(userEmail);
  const sequence = useRef(0);
  currentAccount.current = userEmail;

  const loadBusinesses = useCallback(async () => {
    if (currentAccount.current !== userEmail) return;
    const request = ++sequence.current;
    if (!userEmail) {
      setRows([]); setSelectedId(null); setOwner(null);
      setLoading(false); setBusinessError("");
      return;
    }
    setLoading(true); setBusinessError("");
    try {
      const { data, error } = await supabase.rpc("v3_get_my_businesses");
      if (request !== sequence.current || currentAccount.current !== userEmail) return;
      if (error || !Array.isArray(data)) throw new Error("BUSINESSES_UNAVAILABLE");
      const nextRows = data as BusinessContextItem[];
      const requestedId = preferBusinessFromUrl && typeof window !== "undefined" && window.location?.href
        ? new URL(window.location.href).searchParams.get("business_id") : null;
      setRows(nextRows); setOwner(userEmail);
      setSelectedId(current => {
        if (requestedId && nextRows.some(item => item.business_id === requestedId)) return requestedId;
        if (current && nextRows.some(item => item.business_id === current)) return current;
        return nextRows[0]?.business_id ?? null;
      });
    } catch {
      if (request !== sequence.current || currentAccount.current !== userEmail) return;
      setRows([]); setSelectedId(null); setOwner(userEmail);
      setBusinessError("Daftar bisnis belum dapat dimuat. Silakan coba lagi.");
    } finally {
      if (request === sequence.current && currentAccount.current === userEmail) setLoading(false);
    }
  }, [userEmail, preferBusinessFromUrl]);

  useEffect(() => {
    loadBusinesses();
    return () => { sequence.current++; };
  }, [loadBusinesses]);

  // Hide previous-account state immediately, before effects/network settle.
  const businesses = userEmail && owner === userEmail ? rows : [];
  const businessId = businesses.some(item => item.business_id === selectedId) ? selectedId : null;
  const setBusinessId = (id: string | null) => {
    if (currentAccount.current !== userEmail) return;
    if (id === null || businesses.some(item => item.business_id === id)) setSelectedId(id);
  };
  return {
    businesses, businessId, setBusinessId,
    businessLoading: Boolean(userEmail) && (owner !== userEmail || loading),
    businessError: owner === userEmail ? businessError : "",
    reloadBusinesses: loadBusinesses,
  };
}
