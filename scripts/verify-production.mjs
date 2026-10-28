// Read-only checks: never consumes a license, session, or OAuth callback code.
const origin = "https://spofx.wtf";
let failures = 0;
async function check(path, validate) {
  try {
    const response = await fetch(`${origin}${path}`, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await validate(response);
    console.log(`PASS ${path}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${path}: ${error.message}`);
  }
}
await check("/", async () => {});
await check("/api/health", async (response) => {
  if ((await response.json()).status !== "ok") throw new Error("Service health is not OK");
});
await check("/api/auth/providers", async (response) => {
  const { google } = await response.json();
  if (google?.callbackUrl !== `${origin}/api/auth/callback/google` ||
      google?.signinUrl !== `${origin}/api/auth/signin/google`) {
    throw new Error("Running server does not use the canonical Google OAuth URLs; check NEXTAUTH_URL and deployment status");
  }
});
process.exitCode = failures ? 1 : 0;
