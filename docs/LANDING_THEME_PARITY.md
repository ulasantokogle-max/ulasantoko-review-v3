# Landing page and editor parity

All five theme palettes come from `lib/landingThemes.ts`. Public pages and the editor preview render `LandingCardContent` with the same cover position, logo/profile, branding, title, category, description, promotion, social/PDF links, about section and rating placement.

The editor uses the real rating component in `previewOnly` mode: preview stars are disabled, links cannot navigate, and no feedback or Google lookup requests are sent by preview actions. Saved Google Review availability is read through the existing business setup RPC. Google Review visibility now controls both the review button and rating block in every theme.

Shared CSS applies to both surfaces, including the primary review button and readable text for Minimal Dark. Business about text preserves entered line breaks. PDF actions on the live page retain the internal PDF viewer and card ID; existing physical-card URLs, card ownership, activation, feedback submission and drafts are unchanged.

Validation: `node tests/landing-theme-parity.cjs`, `npm run test:public`, `node tests/landing-draft.cjs`, `npm run test:language`, `npm run build`. Theme parity tests compare server-rendered content and styles for all five themes; no SQL migration is required.

## Layout shared by every palette
All five themes now follow the reference layout: Google rating before links with five star tiles, a full-width PDF button first, two social cards with SVG icons, About, and a thank-you message. Editor previews use the same structure with disabled customer actions. Existing theme colors and visibility toggles remain supported. No SQL migration is required.
