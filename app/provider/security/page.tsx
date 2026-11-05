"use client";

import ProviderMfaGate from "../../components/ProviderMfaGate";
import ProviderAuthenticatorSettings from "../../components/ProviderAuthenticatorSettings";

export default function ProviderSecurityPage() {
  return <ProviderMfaGate><ProviderAuthenticatorSettings /></ProviderMfaGate>;
}
