import unittest,importlib.util
from pathlib import Path

class KaikkiBuildTests(unittest.TestCase):
 def setUp(self):
  source=Path(__file__).resolve().parents[1]/'tools/build-kaikki.py'
  self.assertTrue(source.exists(),'Kaikki snapshot builder is missing')
  spec=importlib.util.spec_from_file_location('kaikki_builder',source)
  self.builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.builder)

 def test_sense_examples_and_synonyms_stay_with_their_meaning(self):
  row={'word':'light','lang_code':'en','pos':'adj','senses':[
   {'glosses':['Not heavy.'],'examples':[{'text':'a light bag','translation':'một chiếc túi nhẹ'}],'synonyms':[{'word':'lightweight'}],'antonyms':[{'word':'heavy'}]},
   {'glosses':['Having light.'],'synonyms':[{'word':'bright'}],'antonyms':[{'word':'dark'}]}]}
  record=self.builder.normalize_entry(row,'en')
  self.assertEqual(record['senses'][0]['synonyms'],['lightweight'])
  self.assertEqual(record['senses'][1]['antonyms'],['dark'])
  self.assertEqual(record['senses'][0]['examples'][0]['translation'],'một chiếc túi nhẹ')
  self.assertEqual(record['senses'][0]['language'],'en')

 def test_translation_requires_a_source_translation_not_a_same_headword_guess(self):
  en=self.builder.normalize_entry({'word':'bank','lang_code':'en','pos':'noun','senses':[{'glosses':['A river edge.']},{'glosses':['A financial institution.'],'translations':[{'code':'vi','word':'ngân hàng'}]}]},'en')
  vi=self.builder.normalize_entry({'word':'bank','lang_code':'en','pos':'noun','senses':[{'glosses':['Ngân hàng.']}]},'vi')
  combined=self.builder.merge_entries([vi,en])
  english=[s for s in combined['senses'] if s['language']=='en']
  self.assertEqual(english[0]['translations'],[])
  self.assertEqual(english[1]['translations'],['ngân hàng'])
  self.assertEqual(len({s['id'] for s in combined['senses']}),3)

 def test_missing_fields_are_empty_and_stable_ids_do_not_depend_on_order(self):
  row={'word':'café','lang_code':'en','pos':'noun','senses':[{'glosses':['A café.']}]}
  a=self.builder.normalize_entry(row,'en');b=self.builder.normalize_entry(row,'en')
  self.assertEqual(a['senses'][0]['id'],b['senses'][0]['id'])
  self.assertEqual(a['sounds'],[]);self.assertEqual(a['senses'][0]['examples'],[])
  self.assertEqual(a['senses'][0]['synonyms'],[])

 def test_audio_urls_and_unknown_sense_relations_are_not_promoted(self):
  row={'word':'hello','lang_code':'en','pos':'intj','sounds':[{'ipa':'/həˈləʊ/','mp3_url':'javascript:alert(1)'},{'audio':'En-uk-hello.ogg','ogg_url':'https://commons.wikimedia.org/wiki/Special:FilePath/En-uk-hello.ogg'}],'synonyms':[{'word':'hi'}],'senses':[{'glosses':['A greeting.']} ]}
  record=self.builder.normalize_entry(row,'en')
  self.assertTrue(all(not s.get('audio','').startswith('javascript:') for s in record['sounds']))
  self.assertEqual(record['senses'][0]['synonyms'],[])
  self.assertEqual(record['relations']['synonyms'],['hi'])

 def test_duplicate_records_merge_without_duplicate_senses(self):
  row={'word':'hello','lang_code':'en','pos':'intj','senses':[{'glosses':['A greeting.'],'examples':[{'text':'Hello, world!'}]}]}
  a=self.builder.normalize_entry(row,'en')
  self.assertEqual(len(self.builder.merge_entries([a,a])['senses']),1)
  self.assertIsNone(self.builder.normalize_entry({**row,'lang_code':'fr'},'en'))

if __name__=='__main__':unittest.main()
