import {beforeEach,describe,expect,it,vi} from 'vitest';
import {POST} from '@/app/api/contact/route';
const mocks=vi.hoisted(()=>({insert:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/admin',()=>({createSupabaseAdminClient:()=>({from:()=>({insert:mocks.insert})})}));
const payload={id:'11111111-1111-4111-8111-111111111111',name:'Test resident',email:'resident@example.com',category:'flooding',sourcePath:'/impact',subject:'Dated observation',message:'Observed standing water at the intersection.',consentContact:true,consentUpdates:false};
let ip=0;
function request(body:unknown,origin='https://protect30a.org'){return new Request('https://protect30a.org/api/contact',{method:'POST',headers:{'content-type':'application/json',origin,'x-vercel-forwarded-for':String(++ip)},body:JSON.stringify(body)});}
describe('private contact capture',()=>{
 beforeEach(()=>mocks.insert.mockReset().mockResolvedValue({error:null}));
 it('saves validated provenance and purpose-specific consent before confirmation',async()=>{const r=await POST(request(payload));expect(r.status).toBe(200);expect(await r.json()).toMatchObject({ok:true,reference:payload.id});expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({source_path:'/impact',category:'flooding',consent_contact:true,consent_updates:false}));});
 it('rejects missing consent and invalid email without storage',async()=>{expect((await POST(request({...payload,consentContact:false}))).status).toBe(422);expect((await POST(request({...payload,email:'invalid'}))).status).toBe(422);expect(mocks.insert).not.toHaveBeenCalled();});
 it('rejects cross-origin writes',async()=>{expect((await POST(request(payload,'https://other.example'))).status).toBe(403);expect(mocks.insert).not.toHaveBeenCalled();});
 it('does not report a successful save on a storage failure',async()=>{mocks.insert.mockResolvedValue({error:{code:'DB_DOWN'}});expect((await POST(request(payload))).status).toBe(503);});
 it('accepts retries without another insertion when the opaque ID already exists',async()=>{mocks.insert.mockResolvedValue({error:{code:'23505'}});expect(await (await POST(request(payload))).json()).toMatchObject({reference:payload.id});});
 it('discards honeypot submissions without a real confirmation reference',async()=>{expect(await(await POST(request({...payload,website:'spam'}))).json()).not.toHaveProperty('reference');expect(mocks.insert).not.toHaveBeenCalled();});
});
