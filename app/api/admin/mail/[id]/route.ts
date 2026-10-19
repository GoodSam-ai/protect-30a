import {canAdmin,getCurrentUserAndProfile} from '@/lib/auth/session';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {profile}=await getCurrentUserAndProfile();if(!canAdmin(profile))return new Response('Forbidden',{status:403});
 const {id}=await params;if(!/^[a-f0-9]{64}$/.test(id))return new Response('Invalid identifier',{status:400});
 const {data,error}=await createSupabaseAdminClient().from('email_history').select('raw_mime_base64').eq('id',id).maybeSingle();
 if(error)return new Response('Mail unavailable',{status:503});if(!data)return new Response('Not found',{status:404});
 return new Response(Buffer.from(data.raw_mime_base64,'base64'),{headers:{'Content-Type':'message/rfc822','Content-Disposition':`attachment; filename="message-${id.slice(0,12)}.eml"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
