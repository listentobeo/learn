import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Track } from "@/lib/types";

export type CertificateTemplateData = {
  studentName: string;
  track: Track;
  completionDate: string;
  certificateCode: string;
  verificationUrl: string;
};

const gold = "#C9A84C";
const ink = "#0A0E17";
const ivory = "#F6F1E7";

const styles = StyleSheet.create({
  page: { backgroundColor: ink, color: ivory, padding: 28, fontFamily: "Helvetica" },
  frame: { height: "100%", borderWidth: 2, borderColor: gold, padding: 9 },
  innerFrame: { height: "100%", borderWidth: 0.7, borderColor: "#6F6037", alignItems: "center", justifyContent: "center", padding: 42 },
  eyebrow: { color: gold, fontSize: 9, letterSpacing: 4, textTransform: "uppercase", marginBottom: 20 },
  school: { fontFamily: "Times-Bold", fontSize: 31, marginBottom: 7 },
  volume: { color: "#B9B3A8", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 38 },
  certifies: { color: "#B9B3A8", fontSize: 11, marginBottom: 13 },
  name: { color: gold, fontFamily: "Times-Italic", fontSize: 39, textAlign: "center", marginBottom: 17 },
  rule: { width: 330, borderBottomWidth: 0.8, borderBottomColor: "#6F6037", marginBottom: 23 },
  statement: { fontSize: 12, lineHeight: 1.8, textAlign: "center", maxWidth: 520 },
  track: { fontFamily: "Times-Bold", fontSize: 24, marginTop: 13, color: ivory },
  date: { color: "#B9B3A8", fontSize: 10, marginTop: 19 },
  signature: { width: 210, alignItems: "center", marginTop: 27 },
  signatureImage: { width: 62, height: 64, objectFit: "contain", marginBottom: 3 },
  signatureRule: { width: 185, borderTopWidth: 0.7, borderTopColor: "#6F6037", marginBottom: 8 },
  signatureName: { fontFamily: "Times-Bold", fontSize: 11 },
  signatureRole: { color: "#A7A098", fontSize: 8, marginTop: 3 },
  footer: { position: "absolute", bottom: 23, left: 35, right: 35, flexDirection: "row", justifyContent: "space-between", color: "#8C877F", fontSize: 7 },
});

function CertificateDocument({ data, signature }: { data: CertificateTemplateData; signature: string }) {
  return (
    <Document title={`${data.studentName} - ${data.track} Certificate`} author="Beo Art Studio">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.innerFrame}>
            <Text style={styles.eyebrow}>Certificate of completion</Text>
            <Text style={styles.school}>Beo School of Art</Text>
            <Text style={styles.volume}>Volume One</Text>
            <Text style={styles.certifies}>This is to certify that</Text>
            <Text style={styles.name}>{data.studentName}</Text>
            <View style={styles.rule} />
            <Text style={styles.statement}>has completed every lesson, knowledge check, practical assignment, and guided review required for the</Text>
            <Text style={styles.track}>{data.track} Track</Text>
            <Text style={styles.date}>Completed {data.completionDate}</Text>
            <View style={styles.signature}>
              {/* react-pdf Image does not expose an HTML alt prop. */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={signature} style={styles.signatureImage} />
              <View style={styles.signatureRule} />
              <Text style={styles.signatureName}>Benjamin Odeke</Text>
              <Text style={styles.signatureRole}>Founder and Lead Instructor</Text>
            </View>
            <View style={styles.footer}>
              <Text>Certificate ID: {data.certificateCode}</Text>
              <Text>{data.verificationUrl}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCertificate(data: CertificateTemplateData) {
  const signatureFile = await readFile(path.join(process.cwd(), "public", "images", "certificate", "benjamin-odeke-signature.png"));
  const signature = `data:image/png;base64,${signatureFile.toString("base64")}`;
  return renderToBuffer(<CertificateDocument data={data} signature={signature} />);
}
