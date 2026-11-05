"use client";

import { useState } from "react";

/**
 * STEP 2.22: isolated design preview. NOT mounted in any route or dashboard.
 * Synthetic data only; no network calls, credentials, mutations or authorization.
 * Feature activation requires separately reviewed server-side gates.
 */
type SupportView = "monitoring" | "request" | "approval" | "session";
const demo = {
  business: "Demo Business (synthetic)",
  requestId: "DEMO-REQUEST-001",
  scopes: ["landing.text", "landing.theme"] as const,
  expiresIn: "30 minutes (illustrative)",
};

export default function ProviderSupportPreview() {
  const [view, setView] = useState<SupportView>("monitoring");
  const tabs: { id: SupportView; label: string }[] = [
    { id: "monitoring", label: "Monitoring" },
    { id: "request", label: "Request" },
    { id: "approval", label: "Owner Approval" },
    { id: "session", label: "Session" },
  ];
  return (
    <section aria-label="Provider Support UI design preview" className="rounded-xl border border-slate-200 bg-white p-5 text-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-xl font-semibold">Provider Support V1</h2><p className="text-sm text-slate-500">Design-only preview · synthetic data · no live access</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">DISABLED</span>
      </div>
      <nav aria-label="Preview sections" className="mb-5 flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button key={tab.id} type="button" onClick={() => setView(tab.id)} aria-pressed={view === tab.id}
            className={`rounded-lg border px-3 py-2 text-sm ${view === tab.id ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-600"}`}>
            {tab.label}
          </button>
        ))}
      </nav>
      {view === "monitoring" && <div className="space-y-2"><h3 className="font-semibold">Read-only monitoring (mock)</h3><p>Business: {demo.business}</p><p>Status: no active support access</p><p className="text-sm text-slate-500">No customer records are loaded.</p></div>}
      {view === "request" && <div className="space-y-2"><h3 className="font-semibold">Support request (mock)</h3><p>Request: {demo.requestId}</p><p>Requested fields: {demo.scopes.join(", ")}</p><p className="text-sm text-slate-500">Request submission is disabled.</p><button type="button" disabled className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-500">Send request (unavailable)</button></div>}
      {view === "approval" && <div className="space-y-2"><h3 className="font-semibold">Owner decision (mock)</h3><p>Owner must explicitly approve each requested field.</p><p className="text-sm text-slate-500">Approval and denial actions are disabled.</p><button type="button" disabled className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-500">Approve (unavailable)</button></div>}
      {view === "session" && <div className="space-y-2"><h3 className="font-semibold">Temporary session (mock)</h3><p>Maximum duration: {demo.expiresIn}</p><p>Session status: inactive</p><p className="text-sm text-slate-500">Revocation and editing are disabled. Enforcement must happen on the server.</p><button type="button" disabled className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-500">Revoke (unavailable)</button></div>}
    </section>
  );
}
