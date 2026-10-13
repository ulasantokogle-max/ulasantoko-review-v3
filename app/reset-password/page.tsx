"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
 const [verified,setVerified]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [pass,setPass]=useState("");
 const [confirm,setConfirm]=useState("");
 const [error,setError]=useState("");
 const [done,setDone]=useState(false);
 useEffect(()=>{
  let active=true;
  const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{
   if(active&&event==="PASSWORD_RECOVERY"){setVerified(true);setLoading(false);}
  });
  async function check(){
   try {
    const url=new URL(window.location.href);
    if(url.searchParams.has("error"))throw Error("invalid");
    const token_hash=url.searchParams.get("token_hash");
    const code=url.searchParams.get("code");
    if(token_hash&&url.searchParams.get("type")==="recovery"){
     const {error}=await supabase.auth.verifyOtp({type:"recovery",token_hash});
     if(error)throw error;
     if(active)setVerified(true);
    } else if(code){
     const {error}=await supabase.auth.exchangeCodeForSession(code);
     if(error)throw error;
     if(active)setVerified(true);
    } else {
     // In implicit flow Supabase emits PASSWORD_RECOVERY after parsing URL.
     await new Promise(resolve=>setTimeout(resolve,800));
    }
   }catch{
    if(active)setError("Link reset tidak valid atau kedaluwarsa.");
   }finally{if(active)setLoading(false);}
  }
  void check();
  return ()=>{active=false;subscription.unsubscribe();};
 },[]);
 async function submit(e:FormEvent){
  e.preventDefault();
  if(!verified||saving)return;
  if(pass.length<12){setError("Minimal 12 karakter.");return;}
  if(pass!==confirm){setError("Konfirmasi tidak cocok.");return;}
  setSaving(true);setError("");
  const {error}=await supabase.auth.updateUser({password:pass});
  if(error){setError("Tidak dapat memperbarui password. Minta link baru jika diperlukan.");}
  else {setDone(true);setVerified(false);setPass("");setConfirm("");await supabase.auth.signOut();}
  setSaving(false);
 }
 return <main style={{maxWidth:460,margin:"60px auto",padding:24,fontFamily:"system-ui"}}>
  <h1>Reset Password Customer</h1>
  {loading?<p role="status">Memvalidasi link...</p>:done?
   <><p>Password berhasil diperbarui.</p><Link href="/dashboard">Login kembali</Link></>:
   !verified?<><p role="alert">{error||"Link tidak valid atau sudah kedaluwarsa."}</p><Link href="/forgot-password">Minta link baru</Link></>:
   <form onSubmit={submit} style={{display:"grid",gap:12}}>
    <label htmlFor="new-pass">Password baru</label>
    <input id="new-pass" type="password" autoComplete="new-password" minLength={12} required value={pass} onChange={e=>setPass(e.target.value)}/>
    <label htmlFor="confirm-pass">Konfirmasi password</label>
    <input id="confirm-pass" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/>
    {error&&<p role="alert">{error}</p>}
    <button type="submit" disabled={saving}>{saving?"Menyimpan...":"Simpan password baru"}</button>
   </form>}
 </main>;
}
