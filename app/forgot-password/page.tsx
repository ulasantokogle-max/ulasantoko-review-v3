"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://yukreview.id/reset-password",
    });
    setLoading(false);
    if (error) {
      // Do not disclose whether an email is registered.
      if (error.status === 429) {
        setErrorMessage("Terlalu banyak permintaan. Coba kembali beberapa saat lagi.");
        return;
      }
      setErrorMessage("Permintaan belum berhasil diproses. Silakan coba lagi.");
      return;
    }
    setSent(true);
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20,background:"#f4f8ff",color:"#152642",fontFamily:"Inter,system-ui,sans-serif"}}>
      <section style={{width:"100%",maxWidth:440,background:"#fff",padding:28,borderRadius:20,border:"1px solid #dbe7fa",boxShadow:"0 14px 45px #122d5312"}}>
        <div style={{fontWeight:900,color:"#2563eb",letterSpacing:".06em"}}>YUKREVIEW</div>
        <h1 style={{fontSize:26,margin:"14px 0 8px"}}>Lupa Password?</h1>
        <p style={{color:"#64748b",lineHeight:1.7}}>Masukkan email akun customer YukReview. Kami akan mengirim tautan untuk membuat password baru.</p>
        {sent ? (
          <div role="status" style={{background:"#eff6ff",borderRadius:12,padding:15,lineHeight:1.7}}>
            Jika email tersebut terdaftar, tautan reset password akan dikirim. Periksa Kotak Masuk dan Spam. Tautan memiliki masa berlaku terbatas.
          </div>
        ) : (
          <form onSubmit={submit} style={{display:"grid",gap:14}}>
            <label htmlFor="customer-email" style={{fontWeight:700}}>Alamat email</label>
            <input id="customer-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="nama@email.com" style={{padding:"13px 14px",borderRadius:10,border:"1px solid #cbd5e1",fontSize:16,width:"100%",boxSizing:"border-box"}}/>
            <button disabled={loading} type="submit" style={{border:0,background:"#2563eb",color:"white",borderRadius:10,padding:14,fontWeight:800,cursor:"pointer"}}>{loading?"Mengirim...":"Kirim Link Reset Password"}</button>
            {errorMessage && <p role="alert" style={{color:"#b91c1c"}}>{errorMessage}</p>}
          </form>
        )}
        <Link href="/dashboard" style={{display:"inline-block",marginTop:22,color:"#2563eb",fontWeight:700}}>Kembali ke Login Dashboard</Link>
      </section>
    </main>
  );
}
