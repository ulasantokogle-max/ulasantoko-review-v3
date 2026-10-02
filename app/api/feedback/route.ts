import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const cardCode = body?.card_code;
    const rating = Number(body?.rating);
    const customerName = body?.customer_name ?? null;
    const customerPhone = body?.customer_phone ?? null;
    const message = body?.message ?? null;
    const category = body?.category ?? null;
    const contactConsent = Boolean(body?.contact_consent);

    if (!cardCode || !Number.isInteger(rating) || rating < 1 || rating > 3) {
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

    if (data?.success === false) {
      console.error("Feedback RPC returned unsuccessful result", data);
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
