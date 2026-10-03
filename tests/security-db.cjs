// Real PostgreSQL semantics in an isolated WASM database, never the live Supabase project.
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const uidA = '00000000-0000-0000-0000-000000000001';
const uidB = '00000000-0000-0000-0000-000000000002';
const provider = '10efbe80-21ab-470d-aafb-43c33fedf612';
(async () => {
 const db = new PGlite({ extensions: { pgcrypto } });
 try {
 await db.exec(`create role anon; create role authenticated;
 create schema auth; create schema extensions; create extension pgcrypto with schema extensions;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
 grant usage on schema public,auth to anon,authenticated;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
 grant usage on schema storage to anon,authenticated;
 grant all on storage.objects to anon,authenticated;`);
 const migrations = ['0001','0003','0006','0007','0009','0012','0013','0019','0020','0021','0022','0023','0027','0031','0037'];
 for (const prefix of migrations) {
  const file = fs.readdirSync('supabase/migrations').find(f=>f.startsWith(prefix+'_'));
  if (prefix==='0037') await db.exec(fs.readFileSync('supabase/checkpoints/2026-10-03_pre_security_v2.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  if (prefix==='0001') await db.exec(`insert into public.users(id) values ('${uidA}'),('${uidB}'),('${provider}'); grant all on all tables in schema public to anon,authenticated;`);
 }
 const orgA=(await db.query("insert into organizations(name,slug) values ('A','a') returning id")).rows[0].id;
 const orgB=(await db.query("insert into organizations(name,slug) values ('B','b') returning id")).rows[0].id;
 const businessA=(await db.query("insert into businesses(organization_id,name,slug) values ($1,'A','a') returning id",[orgA])).rows[0].id;
 const businessB=(await db.query("insert into businesses(organization_id,name,slug) values ($1,'B','b') returning id",[orgB])).rows[0].id;
 await db.query("insert into business_members(business_id,user_id,role) values ($1,$2,'manager'),($3,$4,'manager')",[businessA,uidA,businessB,uidB]);
 const card=(await db.query("insert into cards(business_id,card_code,activation_status) values ($1,'TESTSEC','activated') returning id",[businessA])).rows[0].id;
 await db.query("insert into card_activation(card_id,pin_hash) values ($1,extensions.crypt('123456',extensions.gen_salt('bf')))",[card]);
 async function as(role,uid,sql,args=[]) {
  await db.exec('set role '+role);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);
  try { return await db.query(sql,args); } finally { await db.exec('reset role'); }
 }
 assert.equal((await as('authenticated',uidA,'select id from businesses')).rows.length,1);
 assert.equal((await as('authenticated',uidB,'select id from cards')).rows.length,0);
 await assert.rejects(as('authenticated',uidB,'select * from v3_get_cards($1)',[businessA]),/FORBIDDEN/);
 await assert.rejects(as('authenticated',uidA,'select * from card_activation'),/permission denied/);
 await assert.rejects(as('authenticated',uidA,'select v3_provider_reset_activation_pin($1)',[card]),/FORBIDDEN/);
 await assert.rejects(as('anon',null,'select v3_provider_create_card()'),/permission denied/);
 assert.equal((await as('anon',null,'select * from feedback_submissions')).rows.length,0);
 await assert.rejects(as('authenticated',uidA,`insert into storage.objects(bucket_id,name) values ('landing-media','${uidB}/evil.png')`),/row-level security/);
 await as('authenticated',uidA,`insert into storage.objects(bucket_id,name) values ('landing-media','${uidA}/valid.png')`);
 const bucket=(await db.query("select * from storage.buckets where id='landing-media'")).rows[0];
 assert.equal(Number(bucket.file_size_limit),10485760);assert(!bucket.allowed_mime_types.includes('image/svg+xml'));
 for(let i=0;i<30;i++) {
  const result=await as('anon',null,"select v3_submit_feedback('TESTSEC',2::smallint,null,null,$1,null,false,$2) as value",['message '+i,'session '+i]);
  assert.equal(result.rows[0].value.success,true);
 }
 const blocked=await as('anon',null,"select v3_submit_feedback('TESTSEC',2::smallint,null,null,'new message',null,false,'rotated') as value");
 assert.equal(blocked.rows[0].value.code,'FEEDBACK_RATE_LIMITED');
 for(let i=0;i<10;i++) assert.equal((await as('authenticated',uidA,'select v3_check_google_maps_resolver_rate_limit() as value')).rows[0].value.success,true);
 assert.equal((await as('authenticated',uidA,'select v3_check_google_maps_resolver_rate_limit() as value')).rows[0].value.success,false);
 // Provider can provision; invalid PIN locks at five failures, valid PIN claims a fresh card.
 const provisioned=(await as('authenticated',provider,"select v3_provider_create_card('Test',null,null) as value")).rows[0].value;
 assert.equal(provisioned.success,true);
 for(let i=0;i<5;i++) {
   const result=(await as('authenticated',uidB,"select v3_claim_card($1,'wrong',null,'Business',null) as value",[provisioned.card_code])).rows[0].value;
   assert.equal(result.code,'INVALID_ACTIVATION_PIN');
 }
 assert.equal((await as('authenticated',uidB,"select v3_claim_card($1,'wrong',null,'Business',null) as value",[provisioned.card_code])).rows[0].value.code,'ACTIVATION_TEMPORARILY_LOCKED');
 const fresh=(await as('authenticated',provider,"select v3_provider_create_card('Fresh',null,null) as value")).rows[0].value;
 const claimed=(await as('authenticated',uidA,"select v3_claim_card($1,$2,null,'New Business',null) as value",[fresh.card_code,fresh.activation_pin])).rows[0].value;
 assert.equal(claimed.success,true);
 await db.exec(fs.readFileSync('supabase/checkpoints/2026-10-03_verify_security_v2.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/rollbacks/0037_security_release_hardening_v2_rollback.sql','utf8'));
 assert.equal((await db.query("select file_size_limit from storage.buckets where id='landing-media'")).rows[0].file_size_limit,null);
 await db.exec(fs.readFileSync('supabase/migrations/0037_security_release_hardening_v2.sql','utf8'));
 assert.equal(Number((await db.query("select file_size_limit from storage.buckets where id='landing-media'")).rows[0].file_size_limit),10485760);
 console.log('PASS PostgreSQL tenant isolation, provider/anonymous denial, PIN secrecy, storage ownership, card-wide spam limit and resolver throttle');
 } finally { await db.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
