"use client";

import { FormEvent, useState } from "react";

type Props = {
  cardCode: string;
  businessName: string;
  reviewUrl: string | null;
  whatsappUrl?: string | null;
  primaryColor?: string;
  softColor?: string;
  textColor?: string;
  mutedColor?: string;
  smoothMode?: boolean;
};

function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 46,
        height: 46,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,255,255,.82)",
        boxShadow: "0 8px 20px rgba(103,73,48,.08)",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.2-.2-1.8H12v3.4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.1Z"/>
        <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.4-4H3.3v2.6A10 10 0 0 0 12 22Z"/>
        <path fill="#FBBC05" d="M6.6 14.1A6 6 0 0 1 6.3 12c0-.7.1-1.4.3-2.1V7.3H3.3A10 10 0 0 0 2 12c0 1.7.4 3.3 1.3 4.7l3.3-2.6Z"/>
        <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2 10 10 0 0 0 3.3 7.3l3.3 2.6a5.8 5.8 0 0 1 5.4-4Z"/>
      </svg>
    </span>
  );
}

export default function RatingFlow({
  cardCode,
  businessName,
  reviewUrl,
  whatsappUrl,
  primaryColor = "#8B5E3C",
  softColor = "#F2E5D8",
  textColor = "#4B3428",
  mutedColor = "#7A6659",
  smoothMode = false,
}: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function chooseRating(value: number) {
    setRating(value);
    setError("");

    if (value >= 4) {
      if (!reviewUrl) {
        setError("Link Google Review belum tersedia. Silakan hubungi pemilik bisnis.");
        return;
      }

      window.location.assign(reviewUrl);
    }
  }

  function getFeedbackSessionId() {
    if (typeof window === "undefined") return null;

    const key = "ulasantoko_feedback_session";
    let value = window.sessionStorage.getItem(key);

    if (!value) {
      value =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(key, value);
    }

    return value;
  }

  async function submitFeedback(event: FormEvent) {
    event.preventDefault();

    if (!rating || rating > 3) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card_code: cardCode,
          rating,
          customer_name: name,
          customer_phone: phone,
          message,
          category: "service",
          contact_consent: consent,
          session_id: getFeedbackSessionId(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        console.error("Private feedback submission failed", {
          status: response.status,
          data
        });
        setError("Feedback belum dapat dikirim. Silakan coba lagi.");
        return;
      }

      setSent(true);
    } catch (err) {
      console.error("Private feedback request failed", err);
      setError("Feedback belum dapat dikirim. Periksa koneksi lalu coba lagi.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div
        style={{
          marginTop: smoothMode ? 18 : 22,
          padding: smoothMode ? "22px 18px" : 18,
          borderRadius: smoothMode ? 28 : 16,
          background: smoothMode
            ? "linear-gradient(145deg, rgba(255,255,255,.88), rgba(244,231,215,.86))"
            : "#f0fdf4",
          border: smoothMode ? "1px solid rgba(255,255,255,.78)" : "1px solid #bbf7d0",
          boxShadow: smoothMode
            ? "0 18px 46px rgba(103,73,48,.10), inset 0 1px 0 rgba(255,255,255,.9)"
            : "none",
          textAlign: smoothMode ? "center" : "left",
        }}
      >
        {smoothMode && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <GoogleMark />
          </div>
        )}
        <div style={{ fontWeight: 900, fontSize: smoothMode ? 20 : 18, marginBottom: 8, color: textColor }}>
          Terima kasih atas masukannya
        </div>
        <div style={{ color: mutedColor, lineHeight: 1.6 }}>
          Feedback Anda sudah diterima oleh {businessName}.
        </div>

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              marginTop: 14,
              textAlign: "center",
              textDecoration: "none",
              background: primaryColor,
              color: "#ffffff",
              padding: "12px 14px",
              borderRadius: 12,
              fontWeight: 800,
            }}
          >
            Hubungi Bisnis via WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <section
      className={smoothMode ? "smoothie-rating-card" : undefined}
      style={{
        marginTop: smoothMode ? 18 : 24,
        padding: smoothMode ? "22px 18px 20px" : 0,
        paddingTop: smoothMode ? 22 : 22,
        borderTop: smoothMode ? "1px solid rgba(255,255,255,.72)" : "1px solid rgba(0,0,0,.07)",
        borderRadius: smoothMode ? 28 : 0,
        background: smoothMode
          ? "linear-gradient(145deg, rgba(255,255,255,.86), rgba(244,231,215,.86))"
          : "transparent",
        boxShadow: smoothMode
          ? "0 18px 46px rgba(103,73,48,.11), inset 0 1px 0 rgba(255,255,255,.9)"
          : "none",
      }}
    >
      {smoothMode && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <GoogleMark />
        </div>
      )}
      <div style={{ fontWeight: 900, fontSize: smoothMode ? 21 : 19, textAlign: "center", color: textColor }}>
        {smoothMode ? "Beri kami ulasan Google" : "Bagaimana pengalaman Anda?"}
      </div>
      <div
        style={{
          color: mutedColor,
          textAlign: "center",
          fontSize: 14,
          marginTop: 6,
        }}
      >
        {smoothMode ? "Hanya 10 detik, sangat berarti bagi kami" : "Pilih rating 1 sampai 5 bintang"}
      </div>

      <div
        className={smoothMode ? "smoothie-stars" : undefined}
        style={{
          display: smoothMode ? "grid" : "flex",
          gridTemplateColumns: smoothMode ? "repeat(5, minmax(0, 1fr))" : undefined,
          justifyContent: "center",
          gap: smoothMode ? 8 : 6,
          marginTop: smoothMode ? 18 : 16,
          flexWrap: smoothMode ? undefined : "wrap",
        }}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} bintang`}
            onClick={() => chooseRating(value)}
            style={{
              border: smoothMode ? "1px solid rgba(255,255,255,.8)" : 0,
              background: smoothMode ? "rgba(255,255,255,.72)" : "transparent",
              fontSize: smoothMode ? "clamp(27px, 8vw, 34px)" : 40,
              lineHeight: 1,
              cursor: "pointer",
              padding: smoothMode ? 8 : 5,
              width: smoothMode ? "100%" : "auto",
              minWidth: 0,
              borderRadius: smoothMode ? 16 : 0,
              boxShadow: smoothMode ? "0 8px 18px rgba(103,73,48,.08)" : "none",
              color:
                rating !== null && value <= rating ? "#e5a323" : smoothMode ? "#cfc5bb" : "#d1d5db",
            }}
          >
            ★
          </button>
        ))}
      </div>

      {rating !== null && rating >= 4 && reviewUrl && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 12,
            background: softColor,
            color: textColor,
            textAlign: "center",
            lineHeight: 1.55,
          }}
        >
          Mengarahkan ke Google Review...
        </div>
      )}

      {error && rating !== null && rating >= 4 && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: "#fef2f2",
            color: "#991b1b",
            textAlign: "center",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {rating !== null && rating <= 3 && (
        <form
          onSubmit={submitFeedback}
          style={{
            marginTop: 20,
            padding: 18,
            borderRadius: 18,
            background: softColor,
            border: "1px solid rgba(0,0,0,.06)",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Kami ingin memperbaiki pengalaman Anda
          </div>
          <div
            style={{
              color: mutedColor,
              fontSize: 14,
              lineHeight: 1.55,
              marginBottom: 14,
            }}
          >
            Masukan ini dikirim secara privat ke bisnis dan tidak diposting ke
            Google.
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama (opsional)"
              maxLength={120}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 13px",
                border: "1px solid #d1d5db",
                borderRadius: 12,
                fontSize: 14,
                outline: "none",
                background: "#fff",
              }}
            />

            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="No. WhatsApp (opsional)"
              maxLength={32}
              inputMode="tel"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 13px",
                border: "1px solid #d1d5db",
                borderRadius: 12,
                fontSize: 14,
                outline: "none",
                background: "#fff",
              }}
            />

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ceritakan apa yang bisa kami perbaiki..."
              required
              maxLength={2000}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 13px",
                border: "1px solid #d1d5db",
                borderRadius: 12,
                fontSize: 14,
                resize: "vertical",
                outline: "none",
                background: "#fff",
              }}
            />

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                fontSize: 13,
                color: mutedColor,
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                style={{ marginTop: 2 }}
              />
              Saya bersedia dihubungi oleh bisnis terkait masukan ini.
            </label>

            <button
              type="submit"
              disabled={sending}
              style={{
                border: 0,
                borderRadius: 13,
                padding: "13px 14px",
                fontWeight: 800,
                cursor: "pointer",
                background: primaryColor,
                color: "#ffffff",
              }}
            >
              {sending ? "Mengirim..." : "Kirim Feedback Privat"}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 10,
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
