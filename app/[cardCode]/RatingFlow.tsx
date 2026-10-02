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
};

export default function RatingFlow({
  cardCode,
  businessName,
  reviewUrl,
  whatsappUrl,
  primaryColor = "#8B5E3C",
  softColor = "#F2E5D8",
  textColor = "#4B3428",
  mutedColor = "#7A6659",
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

    if (value >= 4 && reviewUrl) {
      window.open(reviewUrl, "_blank", "noopener,noreferrer");
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
        setError(data?.message ?? "Feedback gagal dikirim.");
        return;
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback gagal dikirim.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div
        style={{
          marginTop: 22,
          padding: 18,
          borderRadius: 16,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
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
    <section style={{ marginTop: 24, paddingTop: 22, borderTop: "1px solid rgba(0,0,0,.07)" }}>
      <div style={{ fontWeight: 900, fontSize: 19, textAlign: "center", color: textColor }}>
        Bagaimana pengalaman Anda?
      </div>
      <div
        style={{
          color: mutedColor,
          textAlign: "center",
          fontSize: 14,
          marginTop: 6,
        }}
      >
        Pilih rating 1 sampai 5 bintang
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} bintang`}
            onClick={() => chooseRating(value)}
            style={{
              border: 0,
              background: "transparent",
              fontSize: 40,
              lineHeight: 1,
              cursor: "pointer",
              padding: 5,
              color:
                rating !== null && value <= rating ? "#f59e0b" : "#d1d5db",
            }}
          >
            ★
          </button>
        ))}
      </div>

      {rating !== null && rating >= 4 && (
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
          Terima kasih. Halaman Google Review sudah dibuka.
          {reviewUrl && (
            <div style={{ marginTop: 8 }}>
              <a
                href={reviewUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: primaryColor, fontWeight: 800 }}
              >
                Buka Google Review lagi
              </a>
            </div>
          )}
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
