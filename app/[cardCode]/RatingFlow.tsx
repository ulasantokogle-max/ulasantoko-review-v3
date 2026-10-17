"use client";

import { FormEvent, useState } from "react";
import { getFeedbackError } from "../../lib/feedbackErrors";
import { useLanguage } from "../../lib/i18n";

type Props = {
  cardCode: string; businessName: string; reviewUrl: string | null; whatsappUrl?: string | null;
  primaryColor?: string; softColor?: string; textColor?: string; mutedColor?: string;
  smoothMode?: boolean; previewOnly?: boolean; privateFeedbackAvailable?: boolean;
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

// Google access never depends on an internal rating or submitting feedback.
export default function RatingFlow({ cardCode, businessName, reviewUrl, whatsappUrl,
  primaryColor = "#8B5E3C", softColor = "#F2E5D8", textColor = "#4B3428", mutedColor = "#7A6659",
  smoothMode = false, previewOnly = false, privateFeedbackAvailable = true }: Props) {
  const { tr } = useLanguage();
  const [privateOpen, setPrivateOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function getFeedbackSessionId() {
    try {
      const key = "ulasantoko_feedback_session";
      let value = window.sessionStorage.getItem(key);
      if (!value) {
        value = typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.sessionStorage.setItem(key, value);
      }
      return value;
    } catch { return null; } // SQL keeps a conservative anonymous throttle.
  }

  async function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (previewOnly || !privateFeedbackAvailable || sending || sent) return;
    if (!rating || !message.trim()) {
      setError(tr("Pilih penilaian internal dan isi masukan Anda.", "Choose an internal rating and enter your feedback."));
      return;
    }
    setSending(true); setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_code: cardCode, rating, customer_name: name, customer_phone: phone,
          message, category: "service", contact_consent: consent, session_id: getFeedbackSessionId() }),
      });
      const data = await response.json();
      if (!response.ok || data?.success !== true) {
        const failure = getFeedbackError(data?.code);
        setError(failure ? tr(failure.id, failure.en) : tr("Masukan belum dapat dikirim. Silakan coba lagi.", "Feedback could not be sent. Please try again."));
        return;
      }
      setSent(true);
    } catch {
      setError(tr("Masukan belum dapat dikirim. Periksa koneksi lalu coba lagi.", "Feedback could not be sent. Check your connection and try again."));
    } finally { setSending(false); }
  }

  return <section className={"public-rating " + (smoothMode ? "smoothie-rating-card" : "")} style={{ color: textColor }}>
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><GoogleMark /></div>
    <h2 style={{ fontWeight: 900, fontSize: 21, textAlign: "center", margin: 0 }}>
      {tr("Bagikan pengalaman Anda", "Share your experience")}
    </h2>
    <p style={{ color: mutedColor, textAlign: "center", fontSize: 14, lineHeight: 1.6 }}>
      {tr("Berikan ulasan jujur di Google. Semua pengalaman Anda berarti bagi kami.", "Leave an honest review on Google. Every experience matters to us.")}
    </p>
    <div className="public-feedback-actions">
      {reviewUrl && !previewOnly ? <a className="public-link public-review-link" href={reviewUrl} target="_blank" rel="noreferrer">
        {tr("Tulis Ulasan di Google", "Write a Review on Google")}
      </a> : <button className="public-link public-review-link" type="button" disabled>
        {tr("Tulis Ulasan di Google", "Write a Review on Google")}
      </button>}
      {!reviewUrl && <p style={{ color: mutedColor, fontSize: 13 }}>{tr("Link ulasan Google belum tersedia.", "The Google review link is not available yet.")}</p>}
      <button className="public-link" type="button" disabled={previewOnly} aria-expanded={privateOpen}
        onClick={() => { if (!previewOnly) setPrivateOpen(!privateOpen); }}>
        {tr("Kirim Masukan untuk Bisnis", "Send Feedback to the Business")}
      </button>
    </div>
    <p style={{ color: mutedColor, fontSize: 12, lineHeight: 1.6 }}>
      {tr("Masukan privat bersifat opsional. Anda dapat menulis ulasan Google tanpa mengisi formulir ini.", "Private feedback is optional. You can write a Google review without completing this form.")}
    </p>
    {privateOpen && (sent ? <div role="status" style={{ padding: 18, borderRadius: 18, background: softColor }}>
      <strong>{tr("Terima kasih atas masukannya", "Thank you for your feedback")}</strong>
      <p>{tr("Masukan Anda sudah diterima oleh", "Your feedback has been received by")} {businessName}.</p>
      {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" style={{ color: textColor }}>{tr("Hubungi Bisnis via WhatsApp", "Contact Business via WhatsApp")}</a>}
    </div> : !privateFeedbackAvailable ? <p role="status" style={{ color: mutedColor }}>
      {tr("Masukan privat sementara belum tersedia. Silakan coba lagi nanti.", "Private feedback is temporarily unavailable. Please try again later.")}
    </p> : <form onSubmit={submitFeedback} style={{ marginTop: 20, padding: 18, borderRadius: 18, background: softColor, textAlign: "left" }}>
      <h3 style={{ marginTop: 0 }}>{tr("Penilaian internal", "Internal Rating")}</h3>
      <p style={{ color: mutedColor, fontSize: 13, lineHeight: 1.6 }}>
        {tr("Penilaian 1–5 ini hanya dikirim ke bisnis, bukan rating Google. Ceritakan pengalaman Anda, baik maupun kurang baik.", "This 1–5 rating is sent only to the business, not Google. Share your experience, positive or negative.")}
      </p>
      <div className="smoothie-stars" role="radiogroup" aria-label={tr("Penilaian internal", "Internal Rating")}
        style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginBottom: 18 }}>
        {[1, 2, 3, 4, 5].map(value => <button key={value} role="radio" aria-checked={rating === value}
          aria-label={`${value} ${tr("bintang", "stars")}`} type="button" disabled={sending || previewOnly}
          onClick={() => { if (!previewOnly) { setRating(value); setError(""); } }}
          style={{ fontSize: "clamp(27px, 8vw, 34px)", padding: 8, minWidth: 0, cursor: "pointer", color: rating !== null && value <= rating ? "#e5a323" : "#918579" }}>★</button>)}
      </div>
      <fieldset disabled={sending || previewOnly} className="public-private-fields">
        <label>{tr("Nama (opsional)", "Name (optional)")}<input value={name} onChange={event => setName(event.target.value)} maxLength={120} autoComplete="name" /></label>
        <label>{tr("No. WhatsApp (opsional)", "WhatsApp Number (optional)")}<input value={phone} onChange={event => setPhone(event.target.value)} maxLength={32} inputMode="tel" autoComplete="tel" /></label>
        <label>{tr("Masukan Anda", "Your Feedback")}<textarea value={message} onChange={event => setMessage(event.target.value)} required maxLength={2000} rows={4} /></label>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: mutedColor }}>
          <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />
          {tr("Saya bersedia dihubungi oleh bisnis terkait masukan ini.", "I agree to be contacted by the business about this feedback.")}
        </label>
        <button type="submit" className="public-link" disabled={!rating || !message.trim() || sending || previewOnly}>
          {sending ? tr("Mengirim...", "Sending...") : tr("Kirim Masukan Privat", "Send Private Feedback")}
        </button>
      </fieldset>
      {error && <p role="alert" style={{ color: "#991b1b", background: "#fef2f2", borderRadius: 10, padding: 10 }}>{error}</p>}
    </form>)}
  </section>;
}
