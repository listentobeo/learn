const defaultSender = "Beo School of Art <school@alerts.beoarts.com>";

export function resendSender() {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) return defaultSender;
  if (configured.includes("@")) return configured;

  const domain = configured
    .replace(/^https?:\/\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .trim();
  return domain ? `Beo School of Art <school@${domain}>` : defaultSender;
}
