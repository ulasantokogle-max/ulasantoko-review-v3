import { ApiInputError, readApiJson } from "../../../lib/apiInput";
import { NextResponse } from "next/server";
import { getFeedbackError } from "../../../lib/feedbackErrors";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      const parsed = await readApiJson(request);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid feedback payload");
      }
      body = parsed;
    } catch (error) {
      return NextResponse.json({ success: false, message: "Data masukan tidak valid." }, { status: error instanceof ApiInputError ? error.status : 400 });
    }

    const cardCode = typeof body.card_code === "string" ? body.card_code.trim() : "";
    const rating = typeof body.rating === "number" || typeof body.rating === "string" ? Number(body.rating) : NaN;
    const customerName = body?.customer_name ?? null;
    const customerPhone = body?.customer_phone ?? null;
    const message = body?.message ?? null;
    const category = body?.category ?? null;
    const contactConsent = body.contact_consent === true;

    const textLimits: Record<string, number> = {
      customer_name: 120, customer_phone: 32, message: 2000, category: 80, session_id: 160,
    };
    const invalidText = Object.entries(textLimits).some(([key, maxLength]) => {
      const value = body[key];
      return value != null && (typeof value !== "string" || Array.from(value.trim()).length > maxLength);
    });
    const invalidConsent = body.contact_consent != null && typeof body.contact_consent !== "boolean";

    if (!cardCode || cardCode.length > 160 || !Number.isInteger(rating) || rating < 1 || rating > 3 || invalidText || invalidConsent) {
      return NextResponse.json(
        {
          success: false,
          message: "Data feedback belum lengkap.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Layanan sedang mengalami kendala.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc("v3_submit_feedback", {
      p_card_code: cardCode,
      p_rating: rating,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_message: message,
      p_category: category,
      p_contact_consent: contactConsent,
      p_session_id: body?.session_id ?? null,
    });

    if (error) {
      console.error("Feedback RPC failed", error);
      return NextResponse.json(
        {
          success: false,
          message: "Feedback belum dapat dikirim. Silakan coba lagi.",
        },
        { status: 400 }
      );
    }

    if (data?.success !== true) {
      console.error("Feedback RPC returned unsuccessful result", { code: data?.code });
      const failure = getFeedbackError(data?.code);
      if (failure) {
        return NextResponse.json(
          { success: false, code: data.code, message: failure.id },
          { status: failure.status }
        );
      }
      return NextResponse.json(
        {
          success: false,
          message: "Feedback belum dapat dikirim. Silakan coba lagi.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Feedback belum dapat dikirim. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
