import { NextRequest, NextResponse } from "next/server";
import { createSign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPREADSHEET_ID = "13DZpXQU9iAagEQAQTsplXhMiHSPTB6dXZ8qak-5RBsM";
const TAB = "Kartu Otomatis";
const HEADERS = ["Dibuat UTC", "Kode Kartu", "PIN Aktivasi", "URL QR", "URL NFC", "Label", "Area", "Kode Internal", "Sumber"];

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function encode(input: object) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

async function googleToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const head = encode({ alg: "RS256", typ: "JWT" });
  const payload = encode({
    iss: email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3500,
  });
  const unsigned = head + "." + payload;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsigned + "." + signature,
    }), cache: "no-store",
  });
  if (!response.ok) throw Error("GOOGLE_TOKEN_FAILED");
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw Error("GOOGLE_TOKEN_MISSING");
  return result.access_token;
}

async function sheetsFetch(path: string, token: string, init?: RequestInit) {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + SPREADSHEET_ID + path, {
    ...init, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) throw Error("SHEETS_REQUEST_FAILED_" + response.status);
  return response.json();
}

export async function POST(req: NextRequest) {
  const bearer = req.headers.get("authorization") || "";
  const jwt = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!jwt) return json({ success: false, error: "LOGIN_REQUIRED" }, 401);
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !anon) return json({ success: false, error: "BACKEND_NOT_CONFIGURED" }, 503);

  const supabase = createClient(supaUrl, anon, {
    global: { headers: { Authorization: "Bearer " + jwt } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user.user) return json({ success: false, error: "INVALID_SESSION" }, 401);
  const { data: isAdmin, error: roleError } = await supabase.rpc("v3_is_provider_admin");
  if (roleError || isAdmin !== true) return json({ success: false, error: "FORBIDDEN" }, 403);

  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return json({ success: false, error: "SHEETS_NOT_CONFIGURED" }, 503);

  let item: Record<string, unknown>;
  try { item = await req.json(); } catch { return json({ success: false, error: "INVALID_JSON" }, 400); }
  const code = String(item.card_code || "");
  const pin = String(item.activation_pin || "");
  const url = String(item.qr_url || "");
  if (!/^ULAS-[0-9]{5,}$/.test(code) || !/^[0-9]{6}$/.test(pin) ||
      !/^https:\/\/yukreview\.id\/[a-zA-Z0-9_-]+$/.test(url)) {
    return json({ success: false, error: "INVALID_CARD_DATA" }, 400);
  }

  // Cross-check that the code belongs to the authenticated Provider's inventory.
  const { data: cards, error: cardsError } = await supabase.rpc("v3_provider_list_cards", { p_limit: 200 });
  if (cardsError || !Array.isArray(cards) || !cards.some(c => c.card_code === code)) {
    return json({ success: false, error: "CARD_NOT_FOUND" }, 409);
  }
  try {
    const token = await googleToken(email, key);
    const metadata = await sheetsFetch("?fields=sheets.properties.title", token) as {
      sheets?: Array<{ properties?: { title?: string } }>;
    };
    if (!metadata.sheets?.some(sheet => sheet.properties?.title === TAB)) {
      await sheetsFetch(":batchUpdate", token, {
        method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB } } }] }),
      });
    }
    const range = encodeURIComponent("'" + TAB + "'!A:B");
    const rows = await sheetsFetch("/values/" + range, token) as { values?: string[][] };
    const entries = rows.values || [];
    const matching = entries.find(row => row[1] === code);
    if (matching) return json({ success: true, already_recorded: true });

    const firstRow = entries.length === 0 ? [HEADERS] : [];
    const valueRows = [...firstRow, [
      new Date().toISOString(), code, pin, url, url,
      String(item.label || "").slice(0, 150), String(item.area || "").slice(0, 150),
      String(item.internal_code || "").slice(0, 150), "YukReview V3 Provider",
    ]];
    await sheetsFetch("/values/" + encodeURIComponent("'" + TAB + "'!A:I") + ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS", token, {
      method: "POST", body: JSON.stringify({ values: valueRows }),
    });
    return json({ success: true, already_recorded: false });
  } catch {
    // Do not log PIN, access tokens, or Google credentials to server logs.
    return json({ success: false, error: "SHEETS_SYNC_FAILED" }, 502);
  }
}
