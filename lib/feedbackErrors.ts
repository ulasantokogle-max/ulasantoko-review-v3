export const feedbackErrors: Record<string, { status: number; id: string; en: string }> = {
  FEEDBACK_RATE_LIMITED: {
    status: 429,
    id: "Terlalu banyak masukan dikirim. Tunggu beberapa menit lalu coba lagi.",
    en: "Too many submissions. Wait a few minutes and try again.",
  },
  DUPLICATE_FEEDBACK: {
    status: 409,
    id: "Masukan yang sama sudah dikirim. Tidak perlu mengirim ulang.",
    en: "This feedback has already been submitted. There is no need to send it again.",
  },
  CARD_NOT_FOUND: {
    status: 404,
    id: "Kartu tidak tersedia atau sudah tidak aktif.",
    en: "This card is unavailable or no longer active.",
  },
  BUSINESS_NOT_FOUND: {
    status: 404,
    id: "Bisnis tidak tersedia atau sudah tidak aktif.",
    en: "This business is unavailable or no longer active.",
  },
};

export function getFeedbackError(code: unknown) {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(feedbackErrors, code)
    ? feedbackErrors[code]
    : undefined;
}
