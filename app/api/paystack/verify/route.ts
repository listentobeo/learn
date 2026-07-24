import { NextResponse } from "next/server";
import { recordSuccessfulCharge, verifyPaystackTransaction } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference || !/^[A-Za-z0-9.=-]+$/.test(reference)) {
    return NextResponse.json({ error: "Invalid transaction reference" }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Live enrollment is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (transaction?.metadata?.student_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (transaction.status !== "success") return NextResponse.json({ status: transaction.status || "pending" });
    await recordSuccessfulCharge(transaction);
    return NextResponse.json({ status: "success" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify payment." }, { status: 502 });
  }
}
