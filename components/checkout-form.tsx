"use client";

import { Building2, Check, CreditCard, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Track } from "@/lib/types";
import { coursePrices, formatPrice, type Currency } from "@/lib/pricing";

export function CheckoutForm({ track, countryCode }: { track: Track; countryCode: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<"full" | "monthly">("full");
  const [loading, setLoading] = useState(false);
  const international = countryCode !== "NG";
  const currency: Currency = international ? "USD" : "NGN";
  const alternateCurrency: Currency = international ? "NGN" : "USD";
  const selectedPrices = coursePrices[track][currency];
  const alternatePrices = coursePrices[track][alternateCurrency];
  const amount = plan === "monthly" ? selectedPrices.monthly : selectedPrices.full;
  const alternateAmount = plan === "monthly" ? alternatePrices.monthly : alternatePrices.full;

  async function pay() {
    setLoading(true);
    try {
      const res = await fetch("/api/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track, plan }) });
      const data = await res.json();
      if (data.authorization_url) window.location.href = data.authorization_url;
      else if (data.demo) { toast.success("Demo enrollment activated."); router.push("/dashboard"); }
      else { toast.error(data.error || "Unable to start payment."); setLoading(false); }
    } catch {
      toast.error("Unable to start payment. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 650, margin: "70px auto", padding: "0 20px" }}>
      <div className="eyebrow">Secure enrollment</div>
      <h1 className="serif" style={{ fontSize: 48, fontWeight: 500, margin: "20px 0 10px" }}>Choose your payment.</h1>
      <p className="subtle">You’re enrolling in the {track} track. {international ? `International checkout · ${countryCode} · card payment only.` : "Nigerian checkout · local payment methods available."}</p>
      <div className="surface" style={{ marginTop: 32 }}>
        <h2>{track} {track === "Discovery" ? "Course" : "Guided"}</h2>
        <label className="option" style={{ marginBottom: 10 }}><input type="radio" name="plan" checked={plan === "full"} onChange={() => setPlan("full")} /><span><strong>Pay in full</strong><br /><span className="subtle">{formatPrice(selectedPrices.full, currency)} <span className="price-equivalent">({formatPrice(alternatePrices.full, alternateCurrency)})</span></span></span></label>
        {selectedPrices.monthly && <label className="option"><input type="radio" name="plan" checked={plan === "monthly"} onChange={() => setPlan("monthly")} /><span><strong>Monthly plan</strong><br /><span className="subtle">{formatPrice(selectedPrices.monthly, currency)} per month <span className="price-equivalent">({formatPrice(alternatePrices.monthly || 0, alternateCurrency)})</span></span></span></label>}
        <div className="payment-method-section">
          <span className="payment-label">Payment method{international ? "" : "s"}</span>
          <div className="payment-methods">
            <span className="payment-method active"><CreditCard size={17} /> Card</span>
            {!international && <><span className="payment-method"><Building2 size={17} /> Bank transfer</span><span className="payment-method"><Smartphone size={17} /> USSD</span></>}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, margin: "25px 0", color: "#b9bec6", fontSize: 13 }}>
          <span><Check size={15} color="#C9A84C" /> Complete lesson library</span>
          <span><Check size={15} color="#C9A84C" /> Quizzes and practical assignments</span>
          <span><Check size={15} color="#C9A84C" /> Guided review with Benjamin</span>
        </div>
        <button className="button" style={{ width: "100%" }} onClick={pay} disabled={loading}>{loading ? "Opening Paystack…" : `Pay ${formatPrice(amount || 0, currency)}`}</button>
        <p style={{ textAlign: "center", color: "#737b88", fontSize: 11, margin: "15px 0 0" }}><ShieldCheck size={13} /> Payment secured by Paystack · charged in {currency}{alternateAmount ? ` · ${formatPrice(alternateAmount, alternateCurrency)} reference` : ""}</p>
      </div>
    </div>
  );
}
