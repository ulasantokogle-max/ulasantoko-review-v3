"use client";

import { useState } from "react";
import { useLanguage } from "../../lib/i18n";

const palettes = {
  mocha: { dark: "#5b3d2eff", light: "#fff8f0ff" },
  matcha: { dark: "#244e42ff", light: "#f5faf3ff" },
  classic: { dark: "#000000ff", light: "#ffffffff" },
};

export default function DownloadCardQr({ cardCode, url, enabled = true }: {
  cardCode: string;
  url: string;
  enabled?: boolean;
}) {
  const { tr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [palette, setPalette] = useState<keyof typeof palettes>("mocha");

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
        color: palettes[palette],
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
        onChange={event => setPalette(event.target.value as keyof typeof palettes)}
        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e4d6c8", background: palettes[palette].light.slice(0, 7), color: palettes[palette].dark.slice(0, 7), fontWeight: 700 }}
      >
        <option value="mocha">{tr("Mocha · krem hangat", "Mocha · warm cream")}</option>
        <option value="matcha">{tr("Matcha · hijau lembut", "Matcha · soft green")}</option>
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
