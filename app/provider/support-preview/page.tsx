import { notFound } from "next/navigation";
import ProviderSupportPreview from "../../../components/providerSupport/ProviderSupportPreview";
import { providerSupportStatus } from "../../../lib/providerSupport/featureFlag";

/**
 * STEP 2.23: protected, inert preview route.
 * Operational flag is hardcoded false in Phase A. No auth/data calls are made.
 * This route must remain inaccessible until a separate security review approves
 * server-side provider authentication, MFA, authorization and deployment.
 */
export default function ProviderSupportPreviewPage() {
  if (!providerSupportStatus().available) notFound();
  return <main className="mx-auto max-w-5xl p-6"><ProviderSupportPreview /></main>;
}
