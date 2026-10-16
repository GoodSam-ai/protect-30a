import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function boot(pathname='/advocacy/helen-mccall-park') {
  const code=await readFile(new URL('../public/assets/traffic.js',import.meta.url),'utf8').catch(()=>'');
  const listeners={}; const scripts=[];
  const document={
    head:{appendChild(s){scripts.push(s);}},
    createElement(){return {dataset:{}};},
    querySelector(){return null;},
    addEventListener(name,fn){listeners[name]=fn;}
  };
  const window={location:{hostname:'protect30a.org',pathname,href:'https://protect30a.org'+pathname}};
  const ctx=vm.createContext({window,document,URL});
  vm.runInContext(code,ctx);
  return {window,listeners,scripts,ctx,code};
}
test('installs one collector even when loaded twice',async()=>{
  const b=await boot(); vm.runInContext(b.code,b.ctx);
  assert.equal(b.scripts.length,1);
  assert.equal(b.scripts[0].src,'/_vercel/insights/script.js');
});
test('tracks commissioner draft opens without copying letter text or mailto query',async()=>{
  const b=await boot();
  assert.equal(typeof b.listeners.click,'function');
  const link={id:'email-all',getAttribute(){return 'mailto:private@example.com?body=SECRET';}};
  b.listeners.click({target:{closest(){return link;}}});
  const event=b.window.vaq.find(args=>args[0]==='event');
  assert.equal(event[1].name,'commissioner_email_draft_opened');
  assert.equal(event[1].data.audience,'all');
  assert.ok(!JSON.stringify(event).includes('SECRET'));
  assert.ok(!JSON.stringify(event).includes('@'));
});
test('redacts query strings and excludes private application routes',async()=>{
  const b=await boot();
  const hook=(b.window.vaq || []).find(args=>args[0]==='beforeSend')?.[1];
  assert.equal(typeof hook,'function');
  assert.equal(hook({url:'https://protect30a.org/act?email=private@example.com#secret'}).url,'https://protect30a.org/act');
  assert.equal(hook({url:'https://protect30a.org/admin'}),null);
});

test('build step covers nested standalone pages and remains idempotent',async()=>{
  const {mkdtemp,mkdir,writeFile,readFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {execFileSync}=await import('node:child_process');
  const root=await mkdtemp(join(tmpdir(),'p30a-traffic-'));
  try {
    await mkdir(join(root,'nested'));
    await writeFile(join(root,'nested','index.html'),'<html><head></head><body>park</body></html>');
    for(let i=0;i<2;i++) execFileSync(process.execPath,['scripts/install-traffic.mjs',root]);
    const html=await readFile(join(root,'nested','index.html'),'utf8');
    assert.equal(html.split('src="/assets/traffic.js"').length-1,1);
    assert.ok(html.includes('<body>park</body>'));
  } finally {await rm(root,{recursive:true,force:true});}
});
