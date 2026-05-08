import { NextRequest, NextResponse } from "next/server";
import { dodoClient } from "@/lib/dodo";
import { sendProofToSolana } from "@/lib/solana";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("webhook-signature");
  const ts = request.headers.get("webhook-timestamp");
  const body = await request.text();

  if (!sig || !ts) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  try {
    // Verify Dodo signature
    const event = await dodoClient.webhook.verify(body, {
      "webhook-signature": sig,
      "webhook-timestamp": ts,
    });

    if (event.type === "payment.succeeded") {
      const { payment_id, total_amount, metadata } = event.data as any;
      const invoiceId = metadata?.invoice_id;

      console.log(`Payment succeeded for invoice ${invoiceId}: ${payment_id}`);

      // ⛓️ Anchor proof on Solana
      // In a real app, we'd hash the invoice data here.
      // For the hackathon, we'll anchor the payment_id and invoiceId.
      const proofHash = `invoice:${invoiceId}|payment:${payment_id}|amount:${total_amount}`;
      
      try {
        const solanaResult = await sendProofToSolana(proofHash);
        console.log("Proof anchored on Solana:", solanaResult.signature);
      } catch (solError) {
        console.error("Failed to anchor proof on Solana:", solError);
        // We still return 200 to Dodo so they don't retry indefinitely
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
