import { NextRequest, NextResponse } from "next/server";
import { dodoClient } from "@/lib/dodo";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, amount, clientName, description } = await request.json();

    if (!invoiceId || !amount) {
      return NextResponse.json(
        { error: "invoiceId and amount are required" },
        { status: 400 }
      );
    }

    const productId = process.env.DODO_PRODUCT_ID;
    if (!productId) {
      return NextResponse.json(
        { error: "DODO_PRODUCT_ID is not configured" },
        { status: 500 }
      );
    }

    // Create Dodo checkout session
    const session = await dodoClient.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        name: clientName || "Customer",
      },
      billing: {
        city: "Mumbai", // Mock city
        country: "IN",   // Mock country
        street: "123 Street",
        zip: "400001",
        state: "MH",
      },
      metadata: { 
        invoice_id: invoiceId 
      },
      payment_links: true,
      return_url: `${request.nextUrl.origin}/proof/${invoiceId}`
    });

    return NextResponse.json({ url: session.url, sessionId: session.session_id });
  } catch (err: any) {
    console.error("Dodo checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
