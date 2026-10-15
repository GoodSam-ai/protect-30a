
const addresses=["dan.curry@mywaltonfl.gov","danny.glidewell@mywaltonfl.gov","brad.drake@mywaltonfl.gov","donna.johns@mywaltonfl.gov","tony.anderson@mywaltonfl.gov"];
const letter=document.getElementById('letter');
function draft(to){return 'mailto:'+to+'?subject='+encodeURIComponent('Raven MAJ26-000007 — request for complete review and protections')+'&body='+encodeURIComponent(letter.value)}
document.getElementById('all').addEventListener('click',function(){this.href=draft(addresses.join(','))});
document.querySelectorAll('.person').forEach(a=>a.addEventListener('click',()=>a.href=draft(a.dataset.email)));
document.getElementById('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(letter.value);document.getElementById('status').textContent='Letter copied.'}catch{letter.focus();letter.select();document.getElementById('status').textContent='Select and copy the letter using your device.'}});

// Publication gate: set only after the actual public route has been deployed and verified.
const publishedShareUrl = 'https://protect30a.org/raven';
const shareStatus = document.getElementById('share-status');
async function copyShareText(value) {
 try { await navigator.clipboard.writeText(value); shareStatus.textContent='Copied.'; }
 catch { const field=document.createElement('textarea');field.value=value;field.setAttribute('aria-label','Text to copy');document.getElementById('share').append(field);field.focus();field.select();shareStatus.textContent='Copy the selected text using your device. The temporary field contains exactly what you requested.'; }
}
document.getElementById('copy-caption').addEventListener('click',()=>copyShareText(document.getElementById('share-caption').value+' '+publishedShareUrl));
if (publishedShareUrl) {
 document.getElementById('copy-link').disabled=false;
 document.getElementById('facebook-share').disabled=false;
 document.getElementById('share-native').disabled=!navigator.share;
 shareStatus.textContent='Choose a sharing option. Instagram and TikTok availability depends on your device and apps.';
 document.getElementById('copy-link').addEventListener('click',()=>copyShareText(publishedShareUrl));
 document.getElementById('facebook-share').addEventListener('click',()=>window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(publishedShareUrl),'_blank','noopener,noreferrer'));
 document.getElementById('share-native').addEventListener('click',async()=>{try{await navigator.share({title:'Raven — Protect the Bay. Prevent More Flooding.',text:document.getElementById('share-caption').value,url:publishedShareUrl});shareStatus.textContent='Share menu closed.';}catch(e){shareStatus.textContent=e.name==='AbortError'?'Sharing canceled.':'Sharing unavailable. Use Copy link.';}});
}
