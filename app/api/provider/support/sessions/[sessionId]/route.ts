import { unavailableSupportResponse } from "../../../../../../lib/providerSupport/response";

export async function GET() {
  return unavailableSupportResponse();
}
