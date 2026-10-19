import unittest
from import_history import parse_message, prepare_batch
BASE=b'From: Sender <sender@example.org>\r\nTo: digitalcommons@icloud.com\r\nSubject: Records reply\r\nDate: Fri, 16 Oct 2026 18:21:01 +0000\r\nMessage-ID: <case-123@example.org>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nReceived.\r\n'
class HistoryTests(unittest.TestCase):
 def test_original_date_and_body(self):
  row=parse_message(BASE); self.assertEqual(row['sent_at'],'2026-10-16T18:21:01+00:00'); self.assertEqual(row['body'].strip(),'Received.')
 def test_repeat_and_forward_same_message_only_once(self):
  rows=prepare_batch([BASE,BASE.replace(b'To: digitalcommons@icloud.com',b'To: correspondence@inbox.protect30a.org')]); self.assertEqual(len(rows),1)
 def test_distinct_identifiers_with_same_subject_are_retained(self):
  self.assertEqual(len(prepare_batch([BASE,BASE.replace(b'case-123@',b'case-124@')])),2)
 def test_missing_message_id_needs_review(self):
  with self.assertRaises(ValueError):parse_message(BASE.replace(b'Message-ID: <case-123@example.org>\r\n',b''))
 def test_same_identifier_different_body_needs_review(self):
  with self.assertRaises(ValueError):prepare_batch([BASE,BASE.replace(b'Received.',b'Different response.')])
 def test_raw_original_preserved(self):
  import base64
  self.assertEqual(base64.b64decode(parse_message(BASE)['raw_mime_base64']),BASE)
if __name__=='__main__':unittest.main()
