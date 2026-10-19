'use server';
import {revalidatePath} from 'next/cache';
import {canAdmin,getCurrentUserAndProfile} from '@/lib/auth/session';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {z} from 'zod';
const updateSchema=z.object({id:z.string().regex(/^[a-z_]+:[A-Za-z0-9_-]+$/),status:z.enum(['new','triaged','waiting','resolved','spam']),owner:z.string().trim().max(120),notes:z.string().trim().max(4000),due:z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;},'Use a valid calendar date')])});
export async function updateIntake(form:FormData){
 const {profile}=await getCurrentUserAndProfile();if(!canAdmin(profile))throw Error('Administrator access required');
 const v=updateSchema.parse(Object.fromEntries(form));
 const {error}=await createSupabaseAdminClient().from('intake_assignments').upsert({source_key:v.id,status:v.status,owner:v.owner,notes:v.notes,due_at:v.due?v.due+'T12:00:00Z':null,updated_at:new Date().toISOString()},{onConflict:'source_key'});
 if(error)throw Error('Unable to save intake changes');revalidatePath('/admin/intake');
}
