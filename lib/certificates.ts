import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderCertificate } from "@/lib/certificate-document";
import { getTrackCompletion } from "@/lib/completion";
import { resendSender } from "@/lib/email";
import type { Track } from "@/lib/types";

export type CertificateRecord = {
  id: string;
  student_id: string;
  track: Track;
  file_path: string;
  file_url: string;
  certificate_code: string;
  issued_at: string;
  email_status: "pending" | "sent" | "failed";
};

function certificateCode(track: Track) {
  const prefix = track === "Drawing" ? "DRW" : track === "Painting" ? "PNT" : "DSC";
  return `BEO-${prefix}-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

function completionMonth(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(date);
}

async function sendCertificateEmail(
  profile: { name: string; email: string },
  certificate: CertificateRecord,
  pdf: Uint8Array,
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
  const firstName = profile.name.trim().split(/\s+/)[0] || profile.name;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: resendSender(),
      to: [profile.email],
      subject: `🎨 Your Beo School of Art Certificate is ready, ${firstName}`,
      html: `<p>Congratulations ${firstName},</p>
        <p>You have completed the ${certificate.track} Track at Beo School of Art Vol.1.</p>
        <p>Your certificate is attached and is also available from your course dashboard.</p>
        <p><strong>Certificate ID:</strong> ${certificate.certificate_code}</p>
        <p>This has been a real journey. Well done.</p>
        <p>— Benjamin Odeke<br>Founder, Beo Art Studio<br><a href="https://beoarts.com">beoarts.com</a></p>`,
      attachments: [{
        filename: `Beo-School-${certificate.track}-${profile.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`,
        content: Buffer.from(pdf).toString("base64"),
      }],
    }),
  });
  if (!response.ok) throw new Error(`Resend delivery failed (${response.status}): ${await response.text()}`);
}

export async function issueCertificate(
  supabase: SupabaseClient,
  studentId: string,
  track: Track,
): Promise<{ certificate: CertificateRecord | null; complete: boolean; existing: boolean }> {
  const { data: existingCertificate, error: existingError } = await supabase
    .from("certificates")
    .select("*")
    .eq("student_id", studentId)
    .eq("track", track)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingCertificate) {
    const certificate = existingCertificate as CertificateRecord;
    if (certificate.email_status === "failed") {
      const [{ data: profile }, { data: file }] = await Promise.all([
        supabase.from("profiles").select("name,email").eq("id", studentId).single(),
        supabase.storage.from("certificates").download(certificate.file_path),
      ]);
      if (profile && file) {
        try {
          await sendCertificateEmail(profile, certificate, new Uint8Array(await file.arrayBuffer()));
          await supabase.from("certificates").update({ email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null }).eq("id", certificate.id);
          certificate.email_status = "sent";
        } catch (error) {
          await supabase.from("certificates").update({ email_error: error instanceof Error ? error.message : "Certificate email retry failed" }).eq("id", certificate.id);
        }
      }
    }
    return { certificate, complete: true, existing: true };
  }

  const progress = await getTrackCompletion(supabase, studentId, track);
  if (!progress.complete) return { certificate: null, complete: false, existing: false };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("name,email")
    .eq("id", studentId)
    .single();
  if (profileError || !profile) throw profileError || new Error("Student profile not found");

  const issuedAt = new Date();
  const code = certificateCode(track);
  const verificationBase = process.env.CERTIFICATE_BASE_URL || `${process.env.NEXT_PUBLIC_SITE_URL || "https://learn.beoarts.com"}/verify`;
  const pdf = await renderCertificate({
    studentName: profile.name,
    track,
    completionDate: completionMonth(issuedAt),
    certificateCode: code,
    verificationUrl: `${verificationBase}/${code}`,
  });
  const id = randomUUID();
  const filePath = `${studentId}/${track.toLowerCase()}-${code}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(filePath, pdf, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = supabase.storage.from("certificates").getPublicUrl(filePath);

  const { data: inserted, error: insertError } = await supabase
    .from("certificates")
    .insert({
      id,
      student_id: studentId,
      track,
      file_path: filePath,
      file_url: publicUrl.publicUrl,
      certificate_code: code,
      issued_at: issuedAt.toISOString(),
    })
    .select("*")
    .single();
  if (insertError) {
    await supabase.storage.from("certificates").remove([filePath]);
    if (insertError.code === "23505") {
      const { data: winner } = await supabase.from("certificates").select("*").eq("student_id", studentId).eq("track", track).single();
      if (winner) return { certificate: winner as CertificateRecord, complete: true, existing: true };
    }
    throw insertError;
  }
  const certificate = inserted as CertificateRecord;

  try {
    await sendCertificateEmail(profile, certificate, pdf);
    await supabase.from("certificates").update({ email_status: "sent", email_sent_at: new Date().toISOString(), email_error: null }).eq("id", id);
    certificate.email_status = "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown certificate email error";
    await supabase.from("certificates").update({ email_status: "failed", email_error: message }).eq("id", id);
    certificate.email_status = "failed";
  }
  return { certificate, complete: true, existing: false };
}
