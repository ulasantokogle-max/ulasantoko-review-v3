import { NextResponse } from "next/server";
import { providerSupportStatus } from "./featureFlag";

/** Phase A: no authentication tokens, user data, or database calls are processed. */
export function unavailableSupportResponse(): NextResponse {
  const status = providerSupportStatus();
  return NextResponse.json(
    { success: false, code: status.configured ? "SUPPORT_NOT_READY" : "SUPPORT_DISABLED" },
    { status: status.configured ? 503 : 403, headers: { "Cache-Control": "no-store" } },
  );
}
