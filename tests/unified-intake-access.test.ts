import {beforeEach,describe,expect,it,vi} from 'vitest';
import {GET} from '@/app/api/admin/intake/events/route';
const mocks=vi.hoisted(()=>({profile:null as null|{role:string;is_restricted:boolean},admin:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getCurrentUserAndProfile:async()=>({profile:mocks.profile}),canAdmin:(p:typeof mocks.profile)=>p?.role==='admin'&&!p.is_restricted}));
vi.mock('@/lib/supabase/admin',()=>({createSupabaseAdminClient:mocks.admin}));
describe('automation feed access',()=>{
 beforeEach(()=>{mocks.profile=null;mocks.admin.mockReset();});
 it.each([null,{role:'moderator',is_restricted:false},{role:'admin',is_restricted:true}])('denies non-admin or restricted profiles',async(profile)=>{mocks.profile=profile;expect((await GET(new Request('https://protect30a.org/api/admin/intake/events'))).status).toBe(403);expect(mocks.admin).not.toHaveBeenCalled();});
 it('rejects invalid cursors before database access',async()=>{mocks.profile={role:'admin',is_restricted:false};expect((await GET(new Request('https://protect30a.org/api/admin/intake/events?after=-1'))).status).toBe(400);expect(mocks.admin).not.toHaveBeenCalled();});
});
