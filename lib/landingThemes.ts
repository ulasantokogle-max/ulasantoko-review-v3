export const landingThemes = {
  warm_brown: { label: "Warm Brown", bg: "#FFF8F1", card: "#FFFFFF", primary: "#8B5E3C", secondary: "#B9825A", soft: "#F2E5D8", text: "#4B3428", muted: "#7A6659" },
  soft_smoothie: { label: "Soft Smoothie", bg: "#FBF5EC", card: "#FFFDFC", primary: "#9B6A43", secondary: "#D7B08A", soft: "#F4E7D7", text: "#4A3023", muted: "#8A7567" },
  soft_tosca: { label: "Soft Tosca", bg: "#F0FBF9", card: "#FFFFFF", primary: "#2A9D8F", secondary: "#67C9BD", soft: "#DDF4F0", text: "#173E39", muted: "#5F7C78" },
  elegant_cream: { label: "Elegant Cream", bg: "#FBF7EF", card: "#FFFDF8", primary: "#9A7B4F", secondary: "#C9B184", soft: "#EFE5D2", text: "#4D4337", muted: "#7D7366" },
  minimal_dark: { label: "Minimal Dark", bg: "#161616", card: "#202020", primary: "#E6C59A", secondary: "#BFA17B", soft: "#2B2B2B", text: "#FAF7F2", muted: "#C9C1B8" }
} as const;


export type LandingTheme = (typeof landingThemes)[keyof typeof landingThemes];
export function getLandingTheme(key: string): LandingTheme {
  return landingThemes[key as keyof typeof landingThemes] ?? landingThemes.warm_brown;
}
