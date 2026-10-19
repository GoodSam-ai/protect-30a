"""Offline .eml parser. No network or mailbox mutations; SQL imports use ON CONFLICT."""
import base64, hashlib, json, email, email.policy, email.utils
from datetime import timezone

def parse_message(raw):
 if len(raw)>30*1024*1024: raise ValueError('Oversize message needs review')
 m=email.message_from_bytes(raw,policy=email.policy.default)
 mid=str(m.get('Message-ID','')).strip()
 if not mid or '\n' in mid or '\r' in mid: raise ValueError('Missing or invalid Message-ID needs review')
 date=email.utils.parsedate_to_datetime(str(m.get('Date','')))
 if date.tzinfo is None: raise ValueError('Date has no timezone')
 text=m.get_body(preferencelist=('plain',))
 body=text.get_content() if text else ''
 attachments=[]
 for a in m.iter_attachments():
  data=a.get_payload(decode=True) or b''
  attachments.append({'filename':a.get_filename(),'content_type':a.get_content_type(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 signature=json.dumps({'subject':str(m.get('Subject','')),'from':str(m.get('From','')),'date':date.isoformat(),'body':body.replace('\r\n','\n'),'attachments':attachments},sort_keys=True)
 return {'id':hashlib.sha256(mid.encode()).hexdigest(),'message_id':mid,'sent_at':date.astimezone(timezone.utc).isoformat(),'sender':str(m.get('From','')),'recipients':[a for _,a in email.utils.getaddresses(m.get_all('To',[])+m.get_all('Cc',[]))],'subject':str(m.get('Subject','')),'body':body,'attachments':attachments,'content_sha256':hashlib.sha256(signature.encode()).hexdigest(),'raw_sha256':hashlib.sha256(raw).hexdigest(),'raw_mime_base64':base64.b64encode(raw).decode(),'source_account':'digitalcommons@icloud.com'}

def prepare_batch(messages):
 rows={}
 for raw in messages:
  row=parse_message(raw)
  if row['id'] in rows and rows[row['id']]['content_sha256']!=row['content_sha256']: raise ValueError('Conflicting content with the same Message-ID needs review')
  rows.setdefault(row['id'],row)
 return list(rows.values())
