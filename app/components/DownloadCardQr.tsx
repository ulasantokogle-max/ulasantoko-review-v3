"use client";

import { useState } from "react";
import { useLanguage } from "../../lib/i18n";
import { rainbowQrPng } from "../../lib/rainbow-qr";

export default function DownloadCardQr({ cardCode, url, enabled = true }: {
  cardCode: string;
  url: string;
  enabled?: boolean;
}) {
  const { tr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [palette, setPalette] = useState<"rainbow" | "classic">("rainbow");

  async function download() {
    setBusy(true);
    setError(false);
    try {
      // Generate in the browser. No card URL or activation PIN is sent to a QR service.
      const { toDataURL, create } = await import("qrcode");
      const destination = new URL(url);
      if (destination.protocol !== "https:") throw new Error("Invalid card URL");
      const image = palette === "rainbow" ? rainbowQrPng(create(url, { errorCorrectionLevel: "M" }).modules) : await toDataURL(url, {
        type: "image/png",
        errorCorrectionLevel: "M",
        margin: 4,
        scale: 32,
        color: { dark: "#000000ff", light: "#ffffffff" },
      });
      const link = document.createElement("a");
      link.href = image;
      link.download = `${cardCode.replace(/[^a-zA-Z0-9_-]/g, "_")}-QR.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <select
        aria-label={tr("Warna QR", "QR color")}
        value={palette}
        disabled={busy || !enabled}
        onChange={event => setPalette(event.target.value === "classic" ? "classic" : "rainbow")}
        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d8d3ef", background: "#ffffff", color: palette === "rainbow" ? "#6d28d9" : "#111827", fontWeight: 700 }}
      >
        <option value="rainbow">{tr("Rainbow · gradasi pelangi", "Rainbow · gradient")}</option>
        <option value="classic">{tr("Klasik · hitam putih", "Classic · black and white")}</option>
      </select>
      <button
        type="button"
        disabled={busy || !enabled}
        onClick={download}
        style={{
          padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db",
          background: "#ffffff", color: "#111827", fontWeight: 800,
          cursor: busy || !enabled ? "default" : "pointer", opacity: busy || !enabled ? 0.6 : 1,
        }}
      >
        {busy ? tr("Menyiapkan QR…", "Preparing QR…") : tr("Unduh QR (PNG)", "Download QR (PNG)")}
      </button>
      {error && <span role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>
        {tr("QR belum dapat diunduh. Silakan coba lagi.", "Could not download the QR. Please try again.")}
      </span>}
    </span>
  );
}
