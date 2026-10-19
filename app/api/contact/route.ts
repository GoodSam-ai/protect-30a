import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { readJson } from '@/lib/action-center/intake';
import { contactSchema } from '@/lib/intake/contact';
export const runtime = 'nodejs';
const attempts = new Map<string,{count:number;expires:number}>();
export async function POST(request: Request) {
 const origin=request.headers.get('origin');
 if(origin && origin!==new URL(request.url).origin) return Response.json({error:'Invalid origin'},{status:403});
 const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0] || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
 const now=Date.now();
 for(const [key,value] of attempts)if(value.expires<now)attempts.delete(key);
 const entry=attempts.get(ip)??{count:0,expires:now+60000};entry.count++;attempts.set(ip,entry);
 if(entry.count>10)return Response.json({error:'Please wait a minute and try again.'},{status:429});
 const body=await readJson(request);
 if(body && typeof body==='object' && 'website' in body && body.website) return Response.json({ok:true});
 const parsed=contactSchema.safeParse(body);
 if(!parsed.success)return Response.json({error:'Please complete all required fields and consent.'},{status:422});
 const v=parsed.data;
 try {
  const admin=createSupabaseAdminClient();
  const {error}=await admin.from('contact_submissions').insert({id:v.id,name:v.name,email:v.email,category:v.category,source_path:v.sourcePath,subject:v.subject,message:v.message,consent_contact:v.consentContact,consent_updates:v.consentUpdates});
  // A lost acknowledgment may be retried with the same opaque request ID.
  if(error && error.code!=='23505')throw error;
  return Response.json({ok:true,reference:v.id});
 } catch {return Response.json({error:'Your message has not been confirmed saved. Please retry; your text is still here.'},{status:503});}
}
