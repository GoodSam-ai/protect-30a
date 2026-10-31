import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeSubmissionKey, validateLocation, validatePhoto } from '@/lib/storm-recovery/photo-intake';
export const runtime = 'nodejs';
const bucket = 'storm-cleanup-private';
export async function POST(request: Request) {
  // Explicit operational gate: creation of this route does not open public submissions.
  if (process.env.STORM_PHOTO_INTAKE_ENABLED !== 'true') return Response.json({error:'Submissions are not open yet.'},{status:503});
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({error:'Invalid origin'},{status:403});
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return Response.json({error:'Multipart form required'},{status:415});
  try {
    const form = await request.formData();
    const photo = form.get('photo');
    if (!(photo instanceof File)) return Response.json({error:'Photo required'},{status:422});
    const photoError = validatePhoto(photo);
    if (photoError) return Response.json({error:photoError},{status:422});
    const email = String(form.get('email') ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({error:'Valid email required'},{status:422});
    const address = String(form.get('address') ?? '').trim().slice(0,500);
    const latText = String(form.get('latitude') ?? '').trim();
    const lngText = String(form.get('longitude') ?? '').trim();
    const latitude = latText === '' ? null : Number(latText);
    const longitude = lngText === '' ? null : Number(lngText);
    const locationError = validateLocation({latitude,longitude,address});
    if (locationError) return Response.json({error:locationError},{status:422});
    const requestKey = normalizeSubmissionKey(String(form.get('requestKey') ?? ''));
    const admin = createSupabaseAdminClient();
    const {data:existing,error:lookupError} = await admin.from('storm_cleanup_reports').select('id').eq('request_key',requestKey).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return Response.json({ok:true,reference:existing.id,duplicate:true});
    const extension: Record<string,string> = {'image/jpeg':'jpg','image/png':'png','image/heic':'heic','image/heif':'heif','image/webp':'webp'};
    const path = `pending/${requestKey}.${extension[photo.type.toLowerCase()]}`;
    const {error:uploadError} = await admin.storage.from(bucket).upload(path,photo,{contentType:photo.type,upsert:false});
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
    const {data:report,error:insertError} = await admin.from('storm_cleanup_reports').insert({
      request_key:requestKey,contact_email:email,location_address:address || null,latitude,longitude,photo_path:path
    }).select('id').single();
    if (insertError) {
      if (insertError.code === '23505') {
        const {data:again} = await admin.from('storm_cleanup_reports').select('id').eq('request_key',requestKey).maybeSingle();
        if (again) return Response.json({ok:true,reference:again.id,duplicate:true});
      }
      throw insertError;
    }
    return Response.json({ok:true,reference:report.id},{status:201});
  } catch {
    return Response.json({error:'Submission was not confirmed. Retry with the same request identifier.'},{status:503});
  }
}
