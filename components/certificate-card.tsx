import { Award, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Certificate } from "@/lib/types";

export function CertificateCard({ certificate }: { certificate: Certificate }) {
  return (
    <section className="certificate-card">
      <div className="certificate-icon"><Award size={26} /></div>
      <div>
        <span className="eyebrow">Track complete</span>
        <h2>Your {certificate.track} certificate is ready.</h2>
        <p><ShieldCheck size={14} /> Certificate ID: <strong>{certificate.certificate_code}</strong></p>
      </div>
      <div className="certificate-actions">
        <a className="button" href={certificate.file_url} download><Download size={15} /> Download certificate</a>
        <Link className="gold-link" href={`/verify/${certificate.certificate_code}`}>Open verification page</Link>
      </div>
    </section>
  );
}
