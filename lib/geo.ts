const countryHeaders = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
] as const;

export function countryCodeFromHeaders(headers: Headers) {
  for (const name of countryHeaders) {
    const value = headers.get(name)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value) && value !== "XX") return value;
  }
  // Local development and hosts without geo headers default to the home market.
  return "NG";
}
