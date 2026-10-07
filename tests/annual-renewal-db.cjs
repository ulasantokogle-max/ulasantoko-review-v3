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
 } finally { await db.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
