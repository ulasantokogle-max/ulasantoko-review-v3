"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

const DEMO_BUSINESS_ID = "99438efc-aeb4-436a-b0c6-90b0a1832674";
const DEMO_MAPS_URL = "https://maps.app.goo.gl/NgqHFE7PQ3iJTZwVA";

export default function TestLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState("");
  const [setupResult, setSetupResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoginStatus("");
    setSetupResult("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginStatus(error.message);
      return;
    }

    setLoginStatus(`Login berhasil: ${data.user?.email ?? "unknown user"}`);
  }

  async function setupGoogleReview() {
    setLoading(true);
    setSetupResult("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setSetupResult("Session tidak ditemukan. Silakan login ulang.");
        return;
      }

      const response = await fetch("/api/google-review/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_id: DEMO_BUSINESS_ID,
          maps_url: DEMO_MAPS_URL,
        }),
      });

      const data = await response.json();

      setSetupResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setSetupResult(
        error instanceof Error ? error.message : "Unknown setup error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 760 }}>
      <h1>V3 Test Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />
      <br />

      <button onClick={login}>Login</button>

      {loginStatus && <p>{loginStatus}</p>}

      <hr style={{ margin: "24px 0" }} />

      <h2>Google Review Setup Test</h2>

      <p>
        Business ID: <code>{DEMO_BUSINESS_ID}</code>
      </p>

      <p>
        Maps URL: <code>{DEMO_MAPS_URL}</code>
      </p>

      <button onClick={setupGoogleReview} disabled={loading}>
        {loading ? "Processing..." : "Setup Google Review"}
      </button>

      {setupResult && (
        <pre
          style={{
            marginTop: 16,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {setupResult}
        </pre>
      )}
    </main>
  );
}
