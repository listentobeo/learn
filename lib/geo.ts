import { isIP } from "node:net";

const countryHeaders = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
] as const;

function validCountry(value: string | null | undefined) {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : null;
}

function publicClientIp(headers: Headers) {
  const raw = headers.get("x-vercel-forwarded-for")
    || headers.get("cf-connecting-ip")
    || headers.get("x-forwarded-for")
    || headers.get("x-real-ip");
  const ip = raw?.split(",")[0]?.trim();
  if (!ip || !isIP(ip)) return null;
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return null;
  return ip;
}

export async function resolveCountryCode(headers: Headers) {
  for (const name of countryHeaders) {
    const country = validCountry(headers.get(name));
    if (country) return country;
  }
  if (process.env.NODE_ENV !== "production") {
    const testCountry = validCountry(headers.get("x-beo-country"));
    if (testCountry) return testCountry;
  }

  const ip = publicClientIp(headers);
  const endpoint = ip ? `https://ipapi.co/${encodeURIComponent(ip)}/country/` : "https://ipapi.co/country/";
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(2500), cache: "no-store" });
    if (response.ok) {
      const country = validCountry(await response.text());
      if (country) return country;
    }
  } catch {
    // If geo lookup is unavailable, keep checkout usable with the safest channel.
  }
  return "UNKNOWN";
}
