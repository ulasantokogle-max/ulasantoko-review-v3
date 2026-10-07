import type { ReactNode } from "react";
import type { LandingTheme } from "../../lib/landingThemes";
import BusinessTitle from "./BusinessTitle";

type Props = {
  theme: LandingTheme; themeKey: string; businessName: string; title: string; description: string;
  category?: string | null; logoUrl?: string | null; coverUrl?: string | null; coverPosition?: string;
  promoText?: string | null; aboutText?: string | null;
  reviewUrl?: string | null; whatsappUrl?: string | null; instagramUrl?: string | null; pdfUrl?: string | null; pdfHref?: string; pdfTitle: string;
  showGoogleReview: boolean; showWhatsapp: boolean; showInstagram: boolean; showPdf: boolean; showAbout: boolean; showPromo: boolean;
  labels: { review: string; about: string; thanks?: string }; rating: ReactNode; preview?: boolean;
};

// Used by both the public page and the editor: theme layout, spacing and visibility
// have one implementation. Preview links and rating never perform customer actions.
export default function LandingCardContent(props: Props) {
  const { theme, themeKey, businessName, title, description, category, logoUrl, coverUrl, coverPosition = "center", preview } = props;
  const position = coverPosition.replace("top-left", "left top").replace("top-right", "right top").replace("bottom-left", "left bottom").replace("bottom-right", "right bottom");
  const links = [
    props.showPdf && props.pdfUrl ? { key: "pdf", label: props.pdfTitle, href: props.pdfHref || props.pdfUrl } : null,
    props.showWhatsapp && props.whatsappUrl ? { key: "whatsapp", label: "WhatsApp", href: props.whatsappUrl } : null,
    props.showInstagram && props.instagramUrl ? { key: "instagram", label: "Instagram", href: props.instagramUrl } : null,
  ].filter(item => item !== null);
  return <>
    <div className="public-hero" style={{ aspectRatio: "16 / 7", backgroundImage: coverUrl ? `url(${JSON.stringify(coverUrl)})` : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: position }} />
    <div className="public-profile" style={{ position: "relative" }}>
      {logoUrl ? <img src={logoUrl} alt={businessName} style={{ objectFit: "cover", background: theme.card }} />
        : <div style={{ display: "grid", placeItems: "center", background: theme.soft, color: theme.primary, fontSize: 24, fontWeight: 900 }}>{businessName.slice(0, 2).toUpperCase()}</div>}
    </div>
    <div className="public-brand" style={{ color: theme.muted, fontWeight: 900 }}>YukReview</div>
    <div className="public-content">
      <BusinessTitle style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 800 }}>{title}</BusinessTitle>
      {category && <div className="public-category">{category}</div>}
      <p className="public-description">{description}</p>
      {props.showPromo && props.promoText && <div className="public-promo">✦ {props.promoText}</div>}
      {props.showGoogleReview && props.rating}
      {links.length > 0 && <div className="public-links smoothie-links" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {links.map(link => {
          const className = "public-link " + (link.key === "pdf" ? "public-pdf-wide" : "public-social-link");
          const content = <><span className="public-link-icon"><LinkIcon kind={link.key} /></span><span>{link.label}</span>{link.key === "pdf" && <span className="public-link-arrow" aria-hidden="true">›</span>}</>;
          return preview ? <span key={link.key} className={className}>{content}</span>
            : <a key={link.key} className={className} href={link.href} target="_blank" rel="noreferrer">{content}</a>;
        })}
      </div>}
      {props.showAbout && props.aboutText && <div className="public-about" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{props.labels.about}</div>
        <div style={{ color: theme.muted, lineHeight: 1.6, fontSize: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{props.aboutText}</div>
      </div>}
      {props.labels.thanks && <div className="public-thanks"><div aria-hidden="true">⌁</div>{props.labels.thanks} {businessName}.</div>}
    </div>
  </>;
}

function LinkIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "pdf" ? <><path d="M6 3h8l4 4v14H6zM14 3v5h4" /><path d="M8 17c3-1 5-5 4-6s-2 5 4 6" /></>
      : kind === "instagram" ? <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" /></>
      : <><path d="M4.5 18.5 3 22l4.4-1.4A9.5 9.5 0 1 0 4.5 18.5Z" /><path d="M8 7c-2 2 1 7 5 9 2 1 4 0 4-2l-3-1-1 1c-2-1-3-2-4-4l1-1Z" /></>}
  </svg>;
}
