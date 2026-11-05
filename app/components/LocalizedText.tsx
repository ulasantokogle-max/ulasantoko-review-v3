"use client";
import { useLanguage } from "../../lib/i18n";
export default function LocalizedText({ text }: { text: string }) {
  const { tr } = useLanguage();
  return <>{tr(text)}</>;
}
