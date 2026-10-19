'use client';
import { useEffect, useRef, useState } from 'react';
import { categories, categoryLabels } from '@/lib/intake/contact';
export function ContactForm(){
 const [context,setContext]=useState({category:'general',subject:'',source:'/contact'});
 const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);const id=useRef('');const lastPayload=useRef('');
 useEffect(()=>{id.current=crypto.randomUUID();const q=new URLSearchParams(location.search);const c=q.get('category')||'general';const source=q.get('source')||'/contact';setContext({category:categories.includes(c as typeof categories[number])?c:'general',subject:(q.get('subject')||'').slice(0,240),source:/^\/(?!\/)/.test(source)?source.slice(0,400):'/contact'});},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const signature=JSON.stringify([...f.entries()]);if(lastPayload.current!==signature){id.current=crypto.randomUUID();lastPayload.current=signature;}setBusy(true);setStatus('Saving your message…');
 try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id.current||crypto.randomUUID(),name:f.get('name'),email:f.get('email'),category:f.get('category'),sourcePath:context.source,subject:f.get('subject'),message:f.get('message'),consentContact:f.has('consentContact'),consentUpdates:f.has('consentUpdates'),website:f.get('website')})});const data=await response.json();if(!response.ok||!data.reference)throw Error(data.error||'Unable to confirm saving. Please retry.');setSaved(true);setStatus('Message received. Reference: '+data.reference+'. Save this reference for follow-up.');}catch(error){setStatus(error instanceof Error?error.message:'Unable to save. Please retry.');}finally{setBusy(false);}}
 return <form onSubmit={submit} className="space-y-5">
 <fieldset disabled={busy||saved} className="space-y-5 disabled:opacity-70">
 <label className="block">Your name<input required name="name" maxLength={120} autoComplete="name" className="block w-full rounded border p-3"/></label>
 <label className="block">Email for a response<input required name="email" type="email" maxLength={254} autoComplete="email" className="block w-full rounded border p-3"/></label>
 <label className="block">What can we help with?<select name="category" value={context.category} onChange={e=>setContext({...context,category:e.target.value})} className="block w-full rounded border p-3">{categories.map(c=><option key={c} value={c}>{categoryLabels[c]}</option>)}</select></label>
 <label className="block">Subject<input required name="subject" maxLength={240} value={context.subject} onChange={e=>setContext({...context,subject:e.target.value})} className="block w-full rounded border p-3"/></label>
 <label className="block">Your message<textarea required minLength={5} maxLength={6000} name="message" rows={7} className="block w-full rounded border p-3" placeholder="For observations, include dates, location, and what you saw. You may include a source link."/></label>
 <div hidden aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <label className="flex items-start gap-3"><input className="mt-1" required type="checkbox" name="consentContact"/><span>I agree that Protect30A may store and review this submission and contact me about it. <a className="underline" href="/records-privacy">Read the privacy notice.</a></span></label>
 <label className="flex items-start gap-3"><input className="mt-1" type="checkbox" name="consentUpdates"/><span>Also send me community updates and meeting alerts (optional).</span></label>
 <button className="rounded bg-protect-teal px-6 py-3 font-semibold text-white" type="submit">{busy?'Saving…':'Send to Protect30A'}</button></fieldset>
 <p role="status" aria-live="polite" className="break-words font-semibold">{status}</p>
 {saved&&<p><a className="underline" href={'mailto:correspondence@inbox.protect30a.org?subject='+encodeURIComponent('Protect30A attachments — '+id.current)}>Email original photographs or attachments with this reference</a>. Attach files in your mail app. They are reviewed privately and are not automatically published.</p>}
 </form>;
}
