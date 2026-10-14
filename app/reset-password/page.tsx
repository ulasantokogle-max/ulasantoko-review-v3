"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let alive = true;
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event, session)=>{
      if (!alive) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
      }
    });
    async function validate() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(url.hash.slice(1));
      const recovery = hash.get("type") === "recovery";
      const recoveryCode = url.searchParams.get("type") === "recovery";
      const hasRecoveryTokens = Boolean(hash.get("access_token") && hash.get("refresh_token"));
      if (code && recoveryCode) {
        const {error} = await supabase.auth.exchangeCodeForSession(code);
        if (!alive) return;
        if (error) {
          setErrorMessage("Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan meminta tautan baru.");
          setChecking(false);
          return;
        }
        setReady(true);
      } else if (recovery && hasRecoveryTokens) {
        // Supabase client automatically processes URL fragments when detectSessionInUrl is enabled.
        const {data:{session}} = await supabase.auth.getSession();
        if (!alive) return;
        setReady(Boolean(session));
        if (!session) setErrorMessage("Tautan reset password tidak valid atau sudah kedaluwarsa.");
      } else {
        setErrorMessage("Buka halaman ini melalui tautan pemulihan password yang valid dari email Anda.");
      }
      if (alive) setChecking(false);
    }
    void validate();
    return ()=>{alive=false;subscription.unsubscribe();};
  }, []);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (password.length < 8) {setErrorMessage("Gunakan minimal 8 karakter.");return;}
    if (password !== confirm) {setErrorMessage("Konfirmasi password belum sama.");return;}
    setLoading(true);
    const {error} = await supabase.auth.updateUser({password});
    setLoading(false);
    if(error) {setErrorMessage("Password gagal diperbarui. Coba minta tautan reset baru.");return;}
    setPassword("");setConfirm("");
    setSuccess(true);
    setReady(false);
    setMessage("Password berhasil diperbarui. Silakan masuk ke dashboard dengan password baru.");
    await supabase.auth.signOut();
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"#f4f8ff",color:"#152642",fontFamily:"Inter,system-ui,sans-serif"}}>
      <section style={{width:"100%",maxWidth:440,background:"#fff",padding:28,borderRadius:20,border:"1px solid #dbe7fa"}}>
        <div style={{fontWeight:900,color:"#2563eb",letterSpacing:".06em"}}>YUKREVIEW</div>
        <h1 style={{fontSize:26,margin:"14px 0 8px"}}>Buat Password Baru</h1>
        {checking ? <p>Memeriksa tautan pemulihan...</p> : null}
        {success ? <p role="status" style={{color:"#166534",lineHeight:1.7}}>{message}</p> : null}
        {!checking && ready && !success ? (
          <form onSubmit={submit} style={{display:"grid",gap:12}}>
            <label htmlFor="new-password">Password baru</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} style={{padding:13,borderRadius:10,border:"1px solid #cbd5e1",fontSize:16}}/>
            <label htmlFor="confirm-password">Ulangi password baru</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} style={{padding:13,borderRadius:10,border:"1px solid #cbd5e1",fontSize:16}}/>
            <button type="submit" disabled={loading} style={{padding:14,border:0,borderRadius:10,background:"#2563eb",color:"#fff",fontWeight:800}}>{loading?"Menyimpan...":"Simpan Password Baru"}</button>
          </form>
        ) : null}
        {errorMessage && <p role="alert" style={{color:"#b91c1c",lineHeight:1.6}}>{errorMessage}</p>}
        <div style={{marginTop:24}}><Link href="/forgot-password" style={{color:"#2563eb"}}>Minta link baru</Link> · <Link href="/dashboard" style={{color:"#2563eb"}}>Login Dashboard</Link></div>
      </section>
    </main>
  );
}
