// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
const { connect } = vi.hoisted(() => ({ connect: vi.fn(() => { throw new Error('must not connect while intake is unreviewed'); }) }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: connect }));
import { POST } from '../app/api/storm-cleanup/route';
const previous = process.env.STORM_PHOTO_INTAKE_ENABLED;
afterEach(() => {
  if (previous === undefined) delete process.env.STORM_PHOTO_INTAKE_ENABLED;
  else process.env.STORM_PHOTO_INTAKE_ENABLED = previous;
  vi.clearAllMocks();
});
describe('unreviewed storm intake cannot be activated by environment configuration', () => {
  it.each([undefined, 'false', 'true'])('refuses submissions with flag %s before reading the body or connecting', async (flag) => {
    if (flag === undefined) delete process.env.STORM_PHOTO_INTAKE_ENABLED;
    else process.env.STORM_PHOTO_INTAKE_ENABLED = flag;
    const request = new Request('https://protect30a.org/api/storm-cleanup', {
      method: 'POST', headers: { origin: 'https://protect30a.org', 'content-type': 'multipart/form-data; boundary=test' }, body: 'synthetic body'
    });
    const parse = vi.spyOn(request, 'formData');
    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Submissions are not open yet.' });
    expect(parse).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it.each([undefined, 'https://evil.example'])('refuses missing or foreign Origin even with flag true', async (origin) => {
    process.env.STORM_PHOTO_INTAKE_ENABLED = 'true';
    const response = await POST(new Request('https://protect30a.org/api/storm-cleanup', {
      method: 'POST', headers: origin ? { origin } : {}
    }));
    expect(response.status).toBe(503);
    expect(connect).not.toHaveBeenCalled();
  });
});
