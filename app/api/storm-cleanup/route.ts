export const runtime = 'nodejs';

// Deliberately closed in code, including when STORM_PHOTO_INTAKE_ENABLED=true.
// The former upload implementation is preserved in Git history at 117211e.
// Reopening requires reviewed canonical authorization/evidence integration and
// the acceptance tests in docs/security/storm-photo-intake-audit-2026-11-01.md.
export async function POST(request: Request) {
  void request; // Keep the handler signature without reading untrusted input.
  return Response.json(
    { error: 'Submissions are not open yet.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
