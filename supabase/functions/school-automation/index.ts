Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const appUrl = Deno.env.get("SCHOOL_APP_URL") || "https://learn.beoarts.com";
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) return new Response("CRON_SECRET is not configured", { status: 500 });
  const response = await fetch(`${appUrl}/api/cron/school`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
});
