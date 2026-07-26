import { CheckCircle2, ShieldX } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function VerifyCertificatePage({ params }: { params: Promise<{ certificate_code: string }> }) {
  const { certificate_code } = await params;
  const admin = createAdminClient();
  let certificate: { student_id: string; track: string; issued_at: string } | null = null;
  let studentName = "";
  if (admin && /^BEO-[A-Z]{3}-[A-Z0-9]{10}$/.test(certificate_code)) {
    const { data } = await admin.from("certificates").select("student_id,track,issued_at").eq("certificate_code", certificate_code).maybeSingle();
    certificate = data;
    if (certificate) {
      const { data: profile } = await admin.from("profiles").select("name").eq("id", certificate.student_id).single();
      studentName = profile?.name || "";
    }
  }
  const valid = Boolean(certificate && studentName);
  return (
    <div className="verification-page">
      <header className="topbar container"><Logo /></header>
      <main className={`verification-card ${valid ? "valid" : "invalid"}`}>
        {valid && certificate ? (
          <>
            <CheckCircle2 size={42} />
            <div className="eyebrow">This certificate is valid</div>
            <h1>{studentName}</h1>
            <p>completed the <strong>{certificate.track} Track</strong><br />at Beo School of Art Vol.1<br />in {new Date(certificate.issued_at).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "Africa/Lagos" })}.</p>
            <span className="certificate-code">Certificate ID: {certificate_code}</span>
            <div className="verification-issuer">Issued by Beo Art Studio · <a href="https://beoarts.com">beoarts.com</a></div>
          </>
        ) : (
          <>
            <ShieldX size={42} />
            <div className="eyebrow">Certificate not found</div>
            <h1>We could not verify this code.</h1>
            <p>Check that the complete certificate ID was entered. A valid Beo certificate is issued only after every requirement in a full track is complete.</p>
            <span className="certificate-code">{certificate_code}</span>
          </>
        )}
        <Link className="gold-link" href="/">Return to Beo School of Art</Link>
      </main>
    </div>
  );
}
