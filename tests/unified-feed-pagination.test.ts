import {beforeEach,describe,expect,it,vi} from 'vitest';
import {GET} from '@/app/api/admin/intake/events/route';
const m=vi.hoisted(()=>({result:{data:[] as Record<string,unknown>[],error:null as null|object},select:vi.fn(),order:vi.fn(),limit:vi.fn(),or:vi.fn(),admin:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getCurrentUserAndProfile:async()=>({profile:{role:'admin',is_restricted:false}}),canAdmin:()=>true}));
vi.mock('@/lib/supabase/admin',()=>({createSupabaseAdminClient:m.admin}));
function req(after?:string){return new Request('https://protect30a.org/api/admin/intake/events'+(after?'?after='+encodeURIComponent(after):''));}
function cursor(value:unknown){return Buffer.from(JSON.stringify(value)).toString('base64url');}
describe('automation snapshot feed',()=>{
 beforeEach(()=>{m.result={data:[],error:null};for(const f of [m.select,m.order,m.limit,m.or,m.admin])f.mockReset();const chain={select:m.select,order:m.order,limit:m.limit,or:m.or,then:(resolve:(v:unknown)=>void)=>resolve(m.result)};for(const f of [m.select,m.order,m.limit,m.or])f.mockReturnValue(chain);m.admin.mockReturnValue({from:()=>chain});});
 it('returns versioned private metadata and an opaque continuation cursor',async()=>{m.result.data=[{id:'contact_submissions:abc',updated_at:'2026-10-19T16:00:00+00:00',automation_key:'revision'}];const response=await GET(req());const data=await response.json();expect(response.headers.get('cache-control')).toBe('private, no-store');expect(data).toMatchObject({schema_version:1,type:'intake.snapshot',requires_review:true});expect(JSON.parse(Buffer.from(data.next_cursor,'base64url').toString())).toEqual({time:'2026-10-19T16:00:00+00:00',id:'contact_submissions:abc'});expect(m.select.mock.calls[0][0]).not.toMatch(/contact_email|contact_name|details|message/);expect(m.limit).toHaveBeenCalledWith(100);});
 it('uses time and stable ID together to avoid missing equal-time records',async()=>{await GET(req(cursor({time:'2026-10-19T16:00:00Z',id:'comments:abc'})));expect(m.or).toHaveBeenCalledWith('updated_at.gt.2026-10-19T16:00:00Z,and(updated_at.eq.2026-10-19T16:00:00Z,id.gt.comments:abc)');});
 it('keeps the cursor when the next page is empty',async()=>{const c=cursor({time:'2026-10-19T16:00:00Z',id:'comments:abc'});expect(await(await GET(req(c))).json()).toMatchObject({items:[],next_cursor:c});});
 it.each(['garbage',cursor(null),cursor({time:'not-date',id:'comments:abc'}),cursor({time:'2026-10-19T16:00:00Z',id:'comments:abc),status.eq.new'}),cursor({time:'2026-10-19T16:00:00Z',id:'../x'})])('rejects malformed cursors before storage access',async c=>{expect((await GET(req(c))).status).toBe(400);expect(m.admin).not.toHaveBeenCalled();});
 it('returns a retryable error when the view cannot be read',async()=>{m.result.error={message:'offline'};expect((await GET(req())).status).toBe(503);});
});
