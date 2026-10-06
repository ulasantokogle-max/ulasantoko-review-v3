"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
function api() { return (window as Window & { turnstile?: Turnstile }).turnstile; }

export default function ProviderCaptcha({ siteKey, ready }: { siteKey: string; ready: boolean }) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const render = useCallback(() => {
    if (!ready || !container.current || widget.current !== null || !api()) return;
    widget.current = api()!.render(container.current, {
      sitekey: siteKey, action: "provider_entry", theme: "light", size: "compact", language: "id",
      callback: (value: string) => { setToken(value); setError(""); },
      "expired-callback": () => { setToken(""); setError("Verifikasi kedaluwarsa. Silakan verifikasi ulang."); },
      "error-callback": () => { setToken(""); setError("Verifikasi tidak dapat dimuat. Periksa koneksi lalu coba lagi."); },
    });
  }, [siteKey, ready]);
  useEffect(() => {
    render();
    return () => { if (widget.current !== null) api()?.remove(widget.current); widget.current = null; };
  }, [render]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/provider/captcha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error();
      router.refresh();
    } catch {
      setError("Verifikasi belum berhasil. Silakan coba lagi."); setToken("");
      if (widget.current !== null) api()?.reset(widget.current);
    } finally { setBusy(false); }
  }
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#f6f3ef", color: "#29231f" }}>
    <section style={{ width: "100%", maxWidth: 440, padding: 28, background: "white", borderRadius: 24, boxShadow: "0 16px 48px #493a2514" }}>
      <p style={{ fontSize: 12, letterSpacing: 2, color: "#8a6b4d" }}>REPUTASIPRO INTERNAL</p>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Verifikasi Akses Provider</h1>
      <p style={{ lineHeight: 1.6, color: "#70685f" }}>Selesaikan verifikasi keamanan untuk melanjutkan ke portal provider.</p>
      {ready ? <form onSubmit={submit}>
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={render} onError={() => setError("Verifikasi tidak dapat dimuat. Muat ulang halaman untuk mencoba lagi.")} />
        <div ref={container} style={{ margin: "24px 0", minHeight: 140, display: "flex", justifyContent: "center" }} />
        <button type="submit" disabled={!token || busy} style={{ width: "100%", padding: 14, border: 0, borderRadius: 14, background: !token || busy ? "#d5cec6" : "#765338", color: "white", fontWeight: 700, cursor: !token || busy ? "default" : "pointer" }}>{busy ? "Memverifikasi…" : "Lanjut ke Provider"}</button>
      </form> : <p role="alert">Verifikasi akses sedang disiapkan. Silakan hubungi pengelola sistem.</p>}
      {error && <p role="alert" style={{ color: "#a42f2f", lineHeight: 1.5 }}>{error}</p>}
      <Link href="/access" style={{ display: "inline-block", marginTop: 24, color: "#765338" }}>Kembali ke Menu Akses</Link>
    </section>
  </main>;
}
