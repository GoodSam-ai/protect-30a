const editor = document.getElementById('community-letter');
const subject = 'Helen McCall Park — closure concerns and public access';
const links = [...document.querySelectorAll('[data-commissioner]'), document.getElementById('email-all')];
function updateDrafts() { for (const link of links) { const recipients = link.dataset.commissioner || "dan.curry@mywaltonfl.gov,danny.glidewell@mywaltonfl.gov,brad.drake@mywaltonfl.gov,donna.johns@mywaltonfl.gov,tony.anderson@mywaltonfl.gov"; link.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(editor.value)}`; } }
editor.addEventListener('input', updateDrafts); updateDrafts();
document.getElementById('copy-letter').addEventListener('click', async () => { const status = document.getElementById('letter-status'); try { await navigator.clipboard.writeText(editor.value); status.textContent = 'Letter copied. Paste it into your email app and review before sending.'; } catch { editor.focus(); editor.select(); status.textContent = 'Select and copy the letter manually, then paste it into your email app.'; } });
