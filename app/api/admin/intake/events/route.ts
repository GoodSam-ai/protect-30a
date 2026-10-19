import {canAdmin,getCurrentUserAndProfile} from '@/lib/auth/session';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const {profile}=await getCurrentUserAndProfile();if(!canAdmin(profile))return Response.json({error:'Forbidden'},{status:403});
 const raw=new URL(request.url).searchParams.get('after');let cursor:{time:string;id:string}|null=null;
 if(raw){try{cursor=JSON.parse(Buffer.from(raw,'base64url').toString());if(!cursor||!/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(cursor.time)||!Number.isFinite(Date.parse(cursor.time))||!/^[a-z_]+:[A-Za-z0-9_-]+$/.test(cursor.id))throw Error();}catch{return Response.json({error:'Invalid cursor'},{status:400});}}
 let query=createSupabaseAdminClient().from('unified_intake').select('id,source_table,source_id,channel,category,source_path,status,consent,owner,due_at,created_at,updated_at,automation_key').order('updated_at').order('id').limit(100);
 if(cursor)query=query.or(`updated_at.gt.${cursor.time},and(updated_at.eq.${cursor.time},id.gt.${cursor.id})`);
 const {data,error}=await query;
 if(error)return Response.json({error:'Events unavailable'},{status:503});
 const last=data?.at(-1);const next=last?Buffer.from(JSON.stringify({time:last.updated_at,id:last.id})).toString('base64url'):raw;
 return Response.json({schema_version:1,type:'intake.snapshot',requires_review:true,items:data,next_cursor:next,notice:'Current revisions, not complete transition history. Poll with overlap and deduplicate automation_key before effects.'},{headers:{'Cache-Control':'private, no-store'}});
}
