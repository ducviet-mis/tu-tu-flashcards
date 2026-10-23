import importlib.util,pathlib,unittest
p=pathlib.Path(__file__).resolve().parents[1]/'tools/build-topics.py'
class TopicBuild(unittest.TestCase):
 def setUp(self):
  self.assertTrue(p.exists(),'Topic builder is missing')
  spec=importlib.util.spec_from_file_location('topics',p);self.m=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.m)
 def test_membership_is_from_source_and_only_kaikki_matches_are_used(self):
  self.assertEqual(self.m.members({'members_core':'apple, pear, imaginary word','members':'banana'}, {'apple','pear','banana'}),['apple','pear'])
 def test_context_selects_real_source_sense_without_inventing_a_translation(self):
  entry={'word':'bank','sounds':[],'senses':[{'id':'shore','language':'vi','gloss':'Bờ sông.','examples':[]},{'id':'money','language':'vi','gloss':'Ngân hàng.','examples':[]}]}
  card=self.m.card(entry,['ngân hàng']);self.assertEqual(card['vi'],'Ngân hàng.');self.assertEqual(card['dictionary']['senseId'],'money');self.assertEqual(card['example'],'')
 def test_word_ids_are_stable_and_audio_is_restricted(self):
  entry={'word':'apple','sounds':[{'audio':'https://evil.invalid/track','ipa':'/a/'}],'senses':[{'id':'fruit','language':'vi','gloss':'Quả táo.','examples':[]}]}
  a=self.m.card(entry,[]);self.assertEqual(a['id'],self.m.card(entry,[])['id']);self.assertEqual(a['dictionary']['audio'],'')
 def test_inflected_cards_use_the_explicit_lemma_meaning_and_keep_surface_pronunciation(self):
  plural={'word':'apples','sounds':[],'senses':[{'id':'plural','language':'vi','gloss':'Số nhiều của apple','examples':[]}]}
  lemma={'word':'apple','sounds':[{'audio':'https://upload.wikimedia.org/apple.ogg'}],'senses':[{'id':'fruit','language':'vi','gloss':'Quả táo.','examples':[]}]}
  c=self.m.card(plural,[],lookup={'apple':lemma});self.assertEqual(c['en'],'apples');self.assertEqual(c['vi'],'Quả táo.');self.assertEqual(c['dictionary']['word'],'apple');self.assertEqual(c['dictionary']['audio'],'')
 def test_an_unmatched_explicit_context_omits_a_misleading_card(self):
  entry={'word':'pin','sounds':[],'senses':[{'id':'pin','language':'vi','gloss':'Ghim, đinh ghim.','examples':[]}]}
  self.assertIsNone(self.m.card(entry,['mã số'],require_context=True))
 def test_reviewed_catalog_rejects_unrelated_homographs_instead_of_teaching_them(self):
  self.assertTrue(hasattr(self.m,'REVIEWED'),'Catalog needs reviewed word/context selections')
  for deck,word in [('greetings','privet'),('greetings','salve'),('greetings','sup'),('shopping terms','hawking')]:self.assertNotIn(word,self.m.REVIEWED[deck])
  e={'word':'shower','sounds':[],'senses':[{'id':'wrong','language':'vi','gloss':'Người chỉ, người cho xem.','examples':[]},{'id':'right','language':'vi','gloss':'Tắm vòi hoa sen.','examples':[]}]}
  cues=self.m.REVIEWED['daily routine']['shower'];self.assertEqual(self.m.card(e,cues,require_context=True)['dictionary']['senseId'],'right')
 def test_context_anchors_match_whole_words_instead_of_unrelated_substrings(self):
  entry={'word':'print','sounds':[],'senses':[{'id':'wrong','language':'vi','gloss':'Tinh thần.','examples':[]},{'id':'right','language':'vi','gloss':'In tài liệu.','examples':[]}]}
  self.assertEqual(self.m.card(entry,['in'],require_context=True)['dictionary']['senseId'],'right')
  entry['senses'].pop();self.assertIsNone(self.m.card(entry,['in'],require_context=True))
if __name__=='__main__':unittest.main()

