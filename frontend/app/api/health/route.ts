/**
 * Public health probe for App Hosting uptime checks.
 * Cloud Run `/health` is IAM-gated; use this route for external monitors.
 */
export async function GET(): Promise<Response> {
  return Response.json({ ok: true });
}
