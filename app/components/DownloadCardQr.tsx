"use client";

import { useState } from "react";
import { useLanguage } from "../../lib/i18n";

export default function DownloadCardQr({ cardCode, url, enabled = true }: {
  cardCode: string;
  url: string;
  enabled?: boolean;
}) {
  const { tr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setBusy(true);
    setError(false);
    try {
      // Generate in the browser. No card URL or activation PIN is sent to a QR service.
      const { toDataURL } = await import("qrcode");
      const destination = new URL(url);
      if (destination.protocol !== "https:") throw new Error("Invalid card URL");
      const image = await toDataURL(url, {
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
