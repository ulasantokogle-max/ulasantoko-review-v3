"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const redirectTo = new URL("/reset-password", window.location.origin).toString();
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) {
        // Avoid exposing whether an address exists; operational errors stay generic.
        setError("Permintaan belum dapat diproses. Coba beberapa saat lagi.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Koneksi bermasalah. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 460, margin: "64px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Lupa Password</h1>
      <p>Masukkan email akun customer. Jika terdaftar, kami akan mengirim tautan pemulihan password.</p>
      {sent ? (
        <p role="status">Jika email terdaftar, tautan reset akan dikirim. Periksa inbox dan spam.</p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label htmlFor="email">Email customer</label>
          <input id="email" type="email" required autoComplete="email" value={email}
            onChange={event => setEmail(event.target.value)}
            style={{ padding: 12, border: "1px solid #bbb", borderRadius: 8 }} />
          <button type="submit" disabled={loading} style={{ padding: 12 }}>
            {loading ? "Memproses..." : "Kirim Link Reset"}
          </button>
          {error && <p role="alert" style={{ color: "#991b1b" }}>{error}</p>}
        </form>
      )}
      <p><Link href="/dashboard">Kembali ke login customer</Link></p>
    </main>
  );
}
