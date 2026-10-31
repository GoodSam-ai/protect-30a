import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/admin',()=>({createSupabaseAdminClient:()=>{throw new Error('must not connect when closed')}}));
import { POST } from '../app/api/storm-cleanup/route';
const previous = process.env.STORM_PHOTO_INTAKE_ENABLED;
afterEach(()=>{if (previous === undefined) delete process.env.STORM_PHOTO_INTAKE_ENABLED; else process.env.STORM_PHOTO_INTAKE_ENABLED=previous;});
describe('storm photo endpoint is closed by default',()=>{
 it('returns 503 and does not connect to storage or database',async()=>{
   delete process.env.STORM_PHOTO_INTAKE_ENABLED;
   const response=await POST(new Request('https://protect30a.org/api/storm-cleanup',{method:'POST'}));
   expect(response.status).toBe(503);
   expect(await response.json()).toMatchObject({error:'Submissions are not open yet.'});
 });
 it('rejects cross-origin writes even when feature flag enabled',async()=>{
   process.env.STORM_PHOTO_INTAKE_ENABLED='true';
   const response=await POST(new Request('https://protect30a.org/api/storm-cleanup',{method:'POST',headers:{origin:'https://evil.example'}}));
   expect(response.status).toBe(403);
 });
 it('requires multipart submission',async()=>{
   process.env.STORM_PHOTO_INTAKE_ENABLED='true';
   const response=await POST(new Request('https://protect30a.org/api/storm-cleanup',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
   expect(response.status).toBe(415);
 });
});
