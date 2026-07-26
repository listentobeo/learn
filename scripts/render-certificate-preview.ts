import { mkdir, writeFile } from "node:fs/promises";
import { renderCertificate } from "../lib/certificate-document";

async function main() {
  const outputDirectory = new URL("../tmp/pdfs/", import.meta.url);
  await mkdir(outputDirectory, { recursive: true });
  const pdf = await renderCertificate({
    studentName: "Amara Okafor",
    track: "Drawing",
    completionDate: "July 2026",
    certificateCode: "BEO-DRW-PREVIEW001",
    verificationUrl: "https://learn.beoarts.com/verify/BEO-DRW-PREVIEW001",
  });
  await writeFile(new URL("beo-certificate-preview.pdf", outputDirectory), pdf);
}

void main();
