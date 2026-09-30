"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TestLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  async function login() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setResult(error.message);
      return;
    }

    setResult(
      JSON.stringify(
        {
          user: data.user?.email,
          access_token: data.session?.access_token,
        },
        null,
        2
      )
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>V3 Test Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={login}>Login</button>

      <pre>{result}</pre>
    </main>
  );
}
