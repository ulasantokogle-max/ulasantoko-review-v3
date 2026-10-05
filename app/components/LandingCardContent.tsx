import type { ReactNode } from "react";
import type { LandingTheme } from "../../lib/landingThemes";
import BusinessTitle from "./BusinessTitle";

type Props = {
  theme: LandingTheme; themeKey: string; businessName: string; title: string; description: string;
  category?: string | null; logoUrl?: string | null; coverUrl?: string | null; coverPosition?: string;
  promoText?: string | null; aboutText?: string | null;
  reviewUrl?: string | null; whatsappUrl?: string | null; instagramUrl?: string | null; pdfUrl?: string | null; pdfHref?: string; pdfTitle: string;
  showGoogleReview: boolean; showWhatsapp: boolean; showInstagram: boolean; showPdf: boolean; showAbout: boolean; showPromo: boolean;
  labels: { review: string; about: string }; rating: ReactNode; preview?: boolean;
};

// Used by both the public page and the editor: theme layout, spacing and visibility
// have one implementation. Preview links and rating never perform customer actions.
export default function LandingCardContent(props: Props) {
  const { theme, themeKey, businessName, title, description, category, logoUrl, coverUrl, coverPosition = "center", preview } = props;
  const smoothie = themeKey === "soft_smoothie";
  const position = coverPosition.replace("top-left", "left top").replace("top-right", "right top").replace("bottom-left", "left bottom").replace("bottom-right", "right bottom");
  const links = [
    !smoothie && props.showGoogleReview && props.reviewUrl ? { key: "review", label: props.labels.review, href: props.reviewUrl } : null,
    props.showWhatsapp && props.whatsappUrl ? { key: "whatsapp", label: "◉ WhatsApp", href: props.whatsappUrl } : null,
    props.showInstagram && props.instagramUrl ? { key: "instagram", label: "◎ Instagram", href: props.instagramUrl } : null,
    props.showPdf && props.pdfUrl ? { key: "pdf", label: "▤ " + props.pdfTitle, href: props.pdfHref || props.pdfUrl } : null,
  ].filter(item => item !== null);
  return <>
    <div className="public-hero" style={{ aspectRatio: "16 / 7", backgroundImage: coverUrl ? `url(${JSON.stringify(coverUrl)})` : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: position }} />
    <div className="public-profile" style={{ position: "relative" }}>
      {logoUrl ? <img src={logoUrl} alt={businessName} style={{ objectFit: "cover", background: theme.card }} />
        : <div style={{ display: "grid", placeItems: "center", background: theme.soft, color: theme.primary, fontSize: 24, fontWeight: 900 }}>{businessName.slice(0, 2).toUpperCase()}</div>}
    </div>
    <div className="public-brand" style={{ color: theme.muted, fontWeight: 900 }}>ReputasiPro</div>
    <div className="public-content">
      <BusinessTitle style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 800 }}>{title}</BusinessTitle>
      {category && <div className="public-category">{category}</div>}
      <p className="public-description">{description}</p>
      {props.showPromo && props.promoText && <div className="public-promo">✦ {props.promoText}</div>}
      {smoothie && props.showGoogleReview && props.rating}
      {links.length > 0 && <div className={"public-links" + (smoothie ? " smoothie-links" : "")} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {links.map(link => {
          const className = "public-link" + (link.key === "review" ? " public-review-link" : "") + (smoothie && link.key === "pdf" ? " public-pdf-wide" : "");
          const style = { textAlign: "center" as const, fontWeight: 900, textDecoration: "none", ...(smoothie && link.key === "pdf" ? { order: -1, gridColumn: "1 / -1" } : {}) };
          return preview ? <span key={link.key} className={className} style={style}>{link.label}</span>
            : <a key={link.key} className={className} href={link.href} target="_blank" rel="noreferrer" style={style}>{link.label}</a>;
        })}
      </div>}
      {props.showAbout && props.aboutText && <div className="public-about" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{props.labels.about}</div>
        <div style={{ color: theme.muted, lineHeight: 1.6, fontSize: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{props.aboutText}</div>
      </div>}
      {!smoothie && props.showGoogleReview && props.rating}
    </div>
  </>;
}
