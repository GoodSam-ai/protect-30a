import {beforeEach,describe,expect,it,vi} from 'vitest';
import {updateIntake} from '@/app/admin/intake/actions';
const m=vi.hoisted(()=>({profile:{role:'admin',is_restricted:false} as {role:string;is_restricted:boolean}|null,upsert:vi.fn(),admin:vi.fn(),refresh:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getCurrentUserAndProfile:async()=>({profile:m.profile}),canAdmin:(p:typeof m.profile)=>p?.role==='admin'&&!p.is_restricted}));
vi.mock('@/lib/supabase/admin',()=>({createSupabaseAdminClient:m.admin}));
vi.mock('next/cache',()=>({revalidatePath:m.refresh}));
function form(overrides:Record<string,string|undefined>={}){const f=new FormData();for(const [k,v]of Object.entries({id:'contact_submissions:11111111-1111-4111-8111-111111111111',status:'triaged',owner:' Heather ',notes:' Review source ',due:'2026-10-22',...overrides}))f.set(k,v??'');return f;}
describe('unified dashboard organization actions',()=>{
 beforeEach(()=>{m.profile={role:'admin',is_restricted:false};m.upsert.mockReset().mockResolvedValue({error:null});m.admin.mockReset().mockReturnValue({from:()=>({upsert:m.upsert})});m.refresh.mockReset();});
 it.each([null,{role:'moderator',is_restricted:false},{role:'admin',is_restricted:true}])('rejects unauthorized updates without touching storage',async p=>{m.profile=p;await expect(updateIntake(form())).rejects.toThrow('Administrator access');expect(m.admin).not.toHaveBeenCalled();});
 it.each(['new','triaged','waiting','resolved','spam'])('saves %s with original-source identity and trimmed fields',async status=>{await updateIntake(form({status}));expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({source_key:expect.stringContaining('contact_submissions:'),status,owner:'Heather',notes:'Review source',due_at:'2026-10-22T12:00:00Z'}),{onConflict:'source_key'});expect(m.refresh).toHaveBeenCalledWith('/admin/intake');});
 it('clears follow-up dates explicitly',async()=>{await updateIntake(form({due:''}));expect(m.upsert.mock.calls[0][0].due_at).toBeNull();});
 it.each([{status:'delivered'},{id:'../other'},{owner:'a'.repeat(121)},{notes:'a'.repeat(4001)},{due:'2026-02-30'},{due:'2026-13-01'}])('rejects invalid organization data %j',async overrides=>{await expect(updateIntake(form(overrides))).rejects.toThrow();expect(m.upsert).not.toHaveBeenCalled();});
 it('supports a real leap day',async()=>{await updateIntake(form({due:'2028-02-29'}));expect(m.upsert.mock.calls[0][0].due_at).toBe('2028-02-29T12:00:00Z');});
 it('reports storage failure without claiming refresh success',async()=>{m.upsert.mockResolvedValue({error:{message:'offline'}});await expect(updateIntake(form())).rejects.toThrow('Unable to save');expect(m.refresh).not.toHaveBeenCalled();});
});
