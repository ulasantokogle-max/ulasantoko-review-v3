"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../lib/i18n";

type NfcWriter = { write: (message: { records: { recordType: "url"; data: string }[] }, options: { signal: AbortSignal; overwrite: boolean }) => Promise<void> };

export default function WriteCardNfc({ cardCode, url, enabled = true }: { cardCode: string; url: string; enabled?: boolean }) {
  const { tr } = useLanguage();
  const [status, setStatus] = useState<"idle" | "writing" | "success" | "unsupported" | "error" | "cancelled" | "timeout" | "copied">("idle");
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; controller.current?.abort("cancelled"); };
  }, []);

  async function write() {
    if (!enabled || controller.current) return;
    try {
      if (new URL(url).protocol !== "https:") throw new Error("Invalid card URL");
      const Reader = (window as unknown as { NDEFReader?: new () => NfcWriter }).NDEFReader;
      if (!window.isSecureContext || !Reader) { setStatus("unsupported"); return; }
      const operation = new AbortController();
      controller.current = operation;
      setStatus("writing");
      const timer = setTimeout(() => operation.abort("timeout"), 30000);
      try {
        // Called directly from the click gesture so the browser can request NFC permission.
        await new Reader().write({ records: [{ recordType: "url", data: url }] }, { signal: operation.signal, overwrite: true });
        if (active.current) setStatus("success");
      } catch {
        if (active.current) setStatus(operation.signal.reason === "timeout" ? "timeout" : operation.signal.reason === "cancelled" ? "cancelled" : "error");
      } finally { clearTimeout(timer); controller.current = null; }
    } catch { if (active.current) setStatus("error"); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setStatus("copied"); }
    catch { setStatus("unsupported"); }
  }

  const writing = status === "writing";
  return <span style={{ display: "inline-flex", flexDirection: "column", gap: 6, maxWidth: 300 }}>
    <button type="button" disabled={!enabled || writing} onClick={write} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#ffffff", color: "#111827", fontWeight: 800, cursor: enabled && !writing ? "pointer" : "default", opacity: enabled && !writing ? 1 : .6 }}>
      {writing ? tr("Menunggu kartu NFC…", "Waiting for NFC tag…") : tr("Tulis NFC", "Write NFC")}
    </button>
    {status !== "idle" && <span role={status === "error" ? "alert" : "status"} style={{ fontSize: 13, lineHeight: 1.5, overflowWrap: "anywhere" }}>
      <strong>{cardCode}</strong><br />
      {writing && tr("Izinkan NFC lalu tempelkan kartu ke HP. Isi URL lama pada tag akan diganti.", "Allow NFC and hold the tag against your phone. The existing tag URL will be replaced.")}
      {status === "success" && tr("URL berhasil ditulis. Coba tap kartu untuk memeriksa tujuannya.", "URL written successfully. Tap the tag to check its destination.")}
      {(status === "unsupported" || status === "copied") && tr("Penulisan langsung membutuhkan Chrome Android pada HP dengan NFC. Di perangkat lain, gunakan URL ini pada aplikasi penulis NFC.", "Direct writing requires Chrome on an NFC-enabled Android phone. On other devices, use this URL in an NFC writing app.")}
      {status === "error" && tr("NFC belum berhasil ditulis. Periksa izin, NFC aktif, dan kartu tidak terkunci serta mendukung NDEF.", "NFC writing failed. Check permission, NFC is enabled, and the tag is writable and supports NDEF.")}
      {status === "cancelled" && tr("Penulisan dibatalkan.", "Writing cancelled.")}
      {status === "timeout" && tr("Waktu menunggu habis. Klik Tulis NFC untuk mencoba lagi.", "Timed out. Click Write NFC to try again.")}
      {status === "copied" && <><br />{tr("URL disalin.", "URL copied.")}</>}
      <br /><span>{url}</span>
    </span>}
    {writing && <button type="button" onClick={() => controller.current?.abort("cancelled")}>{tr("Batalkan", "Cancel")}</button>}
    {(status === "unsupported" || status === "copied") && <button type="button" onClick={copy}>{tr("Salin URL NFC", "Copy NFC URL")}</button>}
  </span>;
}
