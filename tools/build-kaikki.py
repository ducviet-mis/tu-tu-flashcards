"""Build the Kaikki trial snapshot. Raw downloads stay outside the deployed app.

Usage: python tools/build-kaikki.py --vi PATH --en PATH --work PATH
The trial indexes English words with Vietnamese definitions, enriched from the
English edition of the same source. It never reads FVDP or WordNet artifacts.
"""
from pathlib import Path
from urllib.parse import urlparse,quote
import argparse,collections,gzip,hashlib,json,sqlite3,unicodedata,time

def clean(value):
 return unicodedata.normalize('NFC',value.strip()) if isinstance(value,str) else ''
def key(value):return clean(value).lower()
def unique(items):return list(dict.fromkeys(x for x in items if x))
def refs(items):return unique(clean(x.get('word')) for x in items if isinstance(x,dict))[:40]
def audio_url(value):
 if not isinstance(value,str):return ''
 u=urlparse(value)
 return value if u.scheme=='https' and u.hostname in {'upload.wikimedia.org','commons.wikimedia.org'} else ''
def normalize_entry(row,edition):
 word=clean(row.get('word'))
 if row.get('lang_code')!='en' or not word or len(word)>200:return None
 senses=[];pos=clean(row.get('pos')) or 'other'
 for sense in row.get('senses',[]):
  gloss='; '.join(unique(clean(x) for x in sense.get('glosses',[])))
  if not gloss:continue
  examples=[]
  for item in sense.get('examples',[]):
   text=clean(item.get('text'))
   if not text or len(text)>1000 or text.startswith(('Synonym:','Synonyms:','Near-synonym:','Antonym:')):continue
   examples.append({'text':text,'translation':clean(item.get('translation'))[:1000],'ref':clean(item.get('ref'))[:1000]})
  examples.sort(key=lambda e:(bool(e['ref']),len(e['text'])))
  translations=unique(clean(t.get('word')) for t in sense.get('translations',[]) if (t.get('code') or t.get('lang_code'))=='vi')
  sid='kk-'+hashlib.sha256((edition+'\0'+key(word)+'\0'+pos+'\0'+gloss).encode()).hexdigest()[:20]
  senses.append({'id':sid,'language':edition,'pos':pos,'gloss':gloss,'translations':translations,
   'examples':examples[:3],'synonyms':refs(sense.get('synonyms',[])),
   'antonyms':refs(sense.get('antonyms',[])),'topics':unique(sense.get('topics',[])),
   'tags':unique(sense.get('tags',[]))})
 if not senses:return None
 sounds=[]
 for item in row.get('sounds',[]):
  ipa=clean(item.get('ipa'));tags=unique(item.get('tags',[])+item.get('raw_tags',[]))
  if any(t in {'nonstandard','obsolete','historical'} for t in tags):continue
  url=audio_url(item.get('mp3_url')) or audio_url(item.get('ogg_url'))
  if not ipa and not url:continue
  filename=clean(item.get('audio'))
  sounds.append({'ipa':ipa,'audio':url,'tags':tags,'file':filename,
   'attribution':'https://commons.wikimedia.org/wiki/File:'+quote(filename.replace(' ','_')) if filename else ''})
 return {'word':word,'senses':senses,'sounds':sounds,
  'forms':unique(clean(f.get('form')) for f in row.get('forms',[]) if isinstance(f,dict))[:100],
  'relations':{'synonyms':refs(row.get('synonyms',[])),'antonyms':refs(row.get('antonyms',[]))}}

def merge_entries(records):
 result={'word':records[0]['word'],'senses':[],'sounds':[],'forms':[],'relations':{'synonyms':[],'antonyms':[]}}
 senses={};sounds={}
 for record in records:
  if record['word']==record['word'].lower():result['word']=record['word']
  for s in record['senses']:
   if s['id'] not in senses:senses[s['id']]=dict(s)
   else:
    old=senses[s['id']]
    for field in ['synonyms','antonyms','topics','tags','translations']:old[field]=unique(old[field]+s[field])
    examples={e['text']:e for e in old['examples']+s['examples']};old['examples']=list(examples.values())[:3]
  for sound in record['sounds']:sounds[(sound['ipa'],sound['audio'])]=sound
  result['forms']+=record['forms']
  for field in ['synonyms','antonyms']:result['relations'][field]+=record['relations'][field]
 result['senses']=list(senses.values());result['sounds']=list(sounds.values())
 result['forms']=unique(result['forms'])[:100]
 for field in ['synonyms','antonyms']:result['relations'][field]=unique(result['relations'][field])[:40]
 return result

def dump(path,value):
 data=json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
 path.parent.mkdir(parents=True,exist_ok=True)
 with path.open('wb') as f:
  with gzip.GzipFile(filename='',fileobj=f,mode='wb',mtime=0,compresslevel=9) as z:z.write(data)
 return len(data),path.stat().st_size
def bucket(word):
 first=unicodedata.normalize('NFD',word)[0].lower()
 return first if first in 'abcdefghijklmnopqrstuvwxyz' else '0'
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  while chunk:=f.read(1024*1024):h.update(chunk)
 return h.hexdigest()

def build(vi,en,work,output):
 work.mkdir(parents=True,exist_ok=True);dbfile=work/'normalized.sqlite'
 if dbfile.exists():dbfile.unlink()
 db=sqlite3.connect(dbfile);db.execute('pragma journal_mode=OFF');db.execute('pragma synchronous=OFF')
 db.execute('create table records (wordkey text, body text)')
 words=set();record_counts=collections.Counter();start=time.monotonic()
 for edition,file in [('vi',vi),('en',en)]:
  with gzip.open(file,'rt',encoding='utf-8') as source:
   for i,line in enumerate(source):
    row=json.loads(line)
    if row.get('lang_code')!='en':continue
    wordkey=key(row.get('word'))
    if edition=='en' and wordkey not in words:continue
    record=normalize_entry(row,edition)
    if not record:continue
    if edition=='vi':words.add(wordkey)
    db.execute('insert into records values (?,?)',(wordkey,json.dumps(record,ensure_ascii=False,separators=(',',':'))))
    record_counts[edition]+=1
    if record_counts[edition]%20000==0:db.commit();print(f'{edition}: {record_counts[edition]} records',flush=True)
  db.commit();print(f'{edition} complete: {record_counts[edition]} records after {time.monotonic()-start:.1f}s',flush=True)
 db.execute('create index words on records(wordkey)');db.commit()
 revision=hashlib.sha256((digest(vi)+digest(en)+'kaikki-trial-v1').encode()).hexdigest()[:16]
 shards=collections.defaultdict(dict);entries=[];coverage=collections.Counter();allkeys=[]
 for (wordkey,) in db.execute('select distinct wordkey from records order by wordkey'):allkeys.append(wordkey)
 # Source-independent common-word labels help prefix suggestions; they are not definitions.
 common_path=work/'common.json'
 common=set(json.loads(common_path.read_text(encoding='utf-8')).get('commonWords',[])) if common_path.exists() else {'hello','help','he','her','here','heart','health','head','hear','heat','heavy','house','happy'}
 for wordkey in allkeys:
  record=merge_entries([json.loads(r[0]) for r in db.execute('select body from records where wordkey=?',(wordkey,))])
  vi_senses=[s for s in record['senses'] if s['language']=='vi'];en_senses=[s for s in record['senses'] if s['language']=='en']
  preferred=vi_senses or en_senses
  glosses=unique(s['gloss'] for s in preferred)
  entries.append([record['word'],'\n'.join(glosses),'/'.join(unique(s['pos'] for s in preferred)),int(wordkey in common)])
  shards[bucket(wordkey)][wordkey]=record
  coverage['words']+=1;coverage['englishDetails']+=bool(en_senses)
  coverage['ipa']+=any(s['ipa'] for s in record['sounds']);coverage['audio']+=any(s['audio'] for s in record['sounds'])
  coverage['examples']+=any(s['examples'] for s in record['senses']);coverage['translatedExamples']+=any(e['translation'] for s in record['senses'] for e in s['examples'])
  coverage['synonyms']+=any(s['synonyms'] for s in record['senses']) or bool(record['relations']['synonyms'])
  if len(entries)%20000==0:print(f'Assembled {len(entries)} words',flush=True)
 # No truncation of the dictionary index; full original definitions remain in the details.
 metadata={'version':1,'source':'kaikki','revision':revision,'count':len(entries),'commonCount':sum(r[3] for r in entries),
  'entries':entries,'buckets':sorted(shards),'scope':'English words with Vietnamese definitions; English-edition enrichment',
  'coverage':dict(coverage),'sourceURLs':['https://kaikki.org/viwiktionary/','https://kaikki.org/dictionary/English/']}
 sizes={'index':dump(output/'index.json.gz',metadata),'details':{}}
 for name,records in shards.items():sizes['details'][name]=dump(output/(name+'.json.gz'),{'version':1,'source':'kaikki','revision':revision,'entries':records})
 manifest={k:v for k,v in metadata.items() if k!='entries'}
 manifest.update({'sourceSHA256':{'vi':digest(vi),'en':digest(en)},'files':sizes,
  'license':'Wiktionary CC BY-SA / GFDL; audio licensing is per Wikimedia Commons file',
  'extractDate':'2026-10-21','builder':'tools/build-kaikki.py','trial':True})
 (output/'metadata.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 db.close();print(json.dumps({'coverage':dict(coverage),'revision':revision,'compressedBytes':sum(p.stat().st_size for p in output.glob('*.gz')),'seconds':round(time.monotonic()-start,1)}),flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--vi',type=Path,required=True);parser.add_argument('--en',type=Path,required=True);parser.add_argument('--work',type=Path,required=True);parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'data/kaikki')
 args=parser.parse_args();build(args.vi,args.en,args.work,args.output)
