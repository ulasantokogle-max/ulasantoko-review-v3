const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const owner = '00000000-0000-0000-0000-000000000001';
const stranger = '00000000-0000-0000-0000-000000000002';
const provider = '00000000-0000-0000-0000-000000000003';
const business = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const req = n => `20000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
(async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
   grant usage on schema public,auth to anon,authenticated;
   create table businesses(id uuid primary key,name text,display_name text,status text default 'active',created_at timestamptz default now());
   create table business_members(business_id uuid,user_id uuid);
   create table provider_admins(user_id uuid,status text);
   create function is_business_member(p_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from business_members where business_id=p_id and user_id=auth.uid()) $$;
   insert into businesses(id,name) values('${business}','Business A'),('${other}','Business B');
   insert into business_members values('${business}','${owner}');
   insert into provider_admins values('${provider}','active');`);
  await db.exec(fs.readFileSync('supabase/migrations/0039_provider_mfa.sql','utf8'));
  const sql = fs.readFileSync('supabase/migrations/0048_business_annual_renewal.sql','utf8');
  await db.exec(sql); await db.exec(sql);
  const as = async (role, uid, aal, query, args=[]) => {
   await db.exec('begin');
   try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[uid||'',JSON.stringify({aal})]);
    await db.exec('set local role '+role);
    const result=await db.query(query,args); await db.exec('commit'); return result.rows[0]?.v;
   } catch(error) { await db.exec('rollback'); throw error; }
  };
  const renew = (uid, aal, rev, id, bid=business) => as('authenticated',uid,aal,'select v3_provider_renew_business_year($1,$2,$3) v',[bid,rev,id]);
  assert.equal((await db.query('select count(*) n from v3_business_terms')).rows[0].n,0, 'Installation must not start existing business terms');
  assert.equal((await as('authenticated',owner,'aal1','select v3_get_business_term($1) v',[business])).enabled,false);
  await assert.rejects(as('anon',null,null,'select v3_get_business_term($1) v',[business]),/permission denied/);
  await assert.rejects(as('authenticated',stranger,'aal2','select v3_get_business_term($1) v',[business]),/FORBIDDEN/);
  for (const [uid, aal] of [[owner,'aal2'],[stranger,'aal2'],[provider,'aal1'],[provider,null]]) await assert.rejects(renew(uid,aal,0,req(1)),/FORBIDDEN/);
  const first=await renew(provider,'aal2',0,req(1));
  assert.equal(first.success,true); assert.equal(first.revision,1);
  const expected=(await db.query("select ((now() at time zone 'Asia/Jakarta')::date+interval '1 year')::date::text d")).rows[0].d;
  assert.equal(first.expires_on,expected);
  assert.deepEqual(await renew(provider,'aal2',0,req(1)),first,'A lost response retry must not add another year');
  assert.equal((await renew(provider,'aal2',0,req(2))).code,'STALE_TERM');
  const second=await renew(provider,'aal2',1,req(2));
  assert.equal(second.revision,2);
  const extended=(await db.query("select ($1::date+interval '1 year')::date::text d",[expected])).rows[0].d;
  assert.equal(second.expires_on,extended,'Early renewal must preserve remaining term');
  await assert.rejects(renew(provider,'aal2',0,req(1),other),/INVALID_REQUEST/);
  await as('authenticated',owner,'aal1','select v3_get_business_term($1) v',[business]);
  for (const statement of ['select * from v3_business_terms','update v3_business_terms set revision=99','select * from v3_business_term_events']) await assert.rejects(as('authenticated',provider,'aal2',statement),/permission denied/);
  await assert.rejects(as('authenticated',owner,'aal2','select v3_provider_list_business_terms() v'),/FORBIDDEN/);
  assert.equal((await as('authenticated',provider,'aal2','select v3_provider_list_business_terms() v')).length,2);
  await db.query("update v3_business_terms set expires_on=(now() at time zone 'Asia/Jakarta')::date-10 where business_id=$1",[business]);
  assert.equal((await as('authenticated',owner,'aal1','select v3_get_business_term($1) v',[business])).days_remaining,-10);
  assert.equal((await renew(provider,'aal2',2,req(3))).expires_on,expected,'Expired renewal starts from today');
  await db.exec(sql);
  assert.equal((await db.query('select count(*) n from v3_business_term_events')).rows[0].n,3);
  assert.equal((await db.query("select status from businesses where id=$1",[business])).rows[0].status,'active');
  console.log('PASS annual renewal: additive/repeatable install, MFA/provider-only writes, customer tenant isolation, idempotent retries, stale requests, remaining validity preserved and legacy business status unchanged');

  await db.exec(`create table cards(id uuid primary key,business_id uuid,label text);
    create table landing_page_settings(business_id uuid primary key,logo_url text,cover_url text,pdf_url text);
    create table google_review_profiles(id uuid primary key,business_id uuid,maps_url text);
    create table feedback_submissions(id uuid primary key,business_id uuid,status text);
    create schema storage; create table storage.objects(bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant all on businesses,cards,google_review_profiles,feedback_submissions,storage.objects to authenticated;
    grant usage on schema storage to authenticated;
    create policy upload_owner on storage.objects for all to authenticated using (split_part(name,'/',1)=auth.uid()::text) with check(split_part(name,'/',1)=auth.uid()::text);
    create policy public_read on storage.objects for select to anon using(true);
    grant select on storage.objects to anon;
    insert into business_members values('${other}','${owner}');
    insert into cards values('${req(100)}','${business}','Old');
    insert into google_review_profiles values('${req(101)}','${business}','https://maps.google.com/');
    insert into feedback_submissions values('${req(102)}','${business}','new');
    insert into landing_page_settings values('${business}',null,null,'https://project.supabase.co/storage/v1/object/public/landing-media/${owner}/pdf/menu.pdf');
    insert into storage.objects values('landing-media','${owner}/pdf/menu.pdf');`);
  const lockSql=fs.readFileSync('supabase/migrations/0049_expired_dashboard_write_lock.sql','utf8');
  await db.exec(lockSql);await db.exec(lockSql);
  await db.query("update v3_business_terms set expires_on=(now() at time zone 'Asia/Jakarta')::date-1 where business_id=$1",[business]);
  for (const statement of ["update businesses set name='Changed' where id=$1", "update cards set label='Changed' where business_id=$1", "update google_review_profiles set maps_url='Changed' where business_id=$1", "update feedback_submissions set status='resolved' where business_id=$1", "delete from cards where business_id=$1", `update cards set business_id='${other}' where business_id=$1`]) {
    await assert.rejects(as('authenticated',owner,'aal1',statement,[business]),/BUSINESS_TERM_EXPIRED/);
  }
  // Public feedback inserts and reads are preserved even when a customer is signed in.
  await as('authenticated',owner,'aal1',"insert into feedback_submissions values($1,$2,'new')",[req(103),business]);
  await as('authenticated',owner,'aal1','select * from cards where business_id=$1',[business]);
  await assert.rejects(as('authenticated',owner,'aal1',"insert into storage.objects values('landing-media',$1)",[`${owner}/${business}/pdf/new.pdf`]),/row-level security/);
  await assert.rejects(as('authenticated',owner,'aal1',"delete from storage.objects where name=$1 returning name v",[`${owner}/pdf/menu.pdf`]).then(v=>{ if(v===undefined)throw Error('RLS_DENIED'); }),/RLS_DENIED|row-level security/);
  // An unrelated legacy business and valid assets remain writable.
  await as('authenticated',owner,'aal1',"update businesses set name='Legacy Changed' where id=$1",[other]);
  await as('authenticated',owner,'aal1',"insert into storage.objects values('landing-media',$1)",[`${owner}/${other}/pdf/new.pdf`]);
  // MFA provider can manage an expired business and renew it without changing card status.
  await as('authenticated',provider,'aal2',"update cards set label='Provider Changed' where business_id=$1",[business]);
  await renew(provider,'aal2',3,req(4));
  await as('authenticated',owner,'aal1',"update cards set label='Renewed' where business_id=$1",[business]);
  await as('authenticated',owner,'aal1',"insert into storage.objects values('landing-media',$1)",[`${owner}/${business}/pdf/renewed.pdf`]);
  await db.exec(lockSql);
  console.log('PASS dashboard expiry lock: direct writes and moves denied, storage protected, public feedback/read preserved, legacy business unaffected, provider renewal restores edits');
 } finally { await db.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
