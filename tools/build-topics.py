"""Prepare immutable everyday decks: Linguabase membership, Kaikki card text.
Raw Linguabase archives are input files outside the public app, never runtime dependencies.
"""
from pathlib import Path
import argparse,csv,gzip,hashlib,json,re,unicodedata
from urllib.parse import urlparse,quote

def key(s):return unicodedata.normalize('NFC',str(s)).strip().lower()
def context_matches(cue,gloss):
 return bool(re.search(r'(?<!\w)'+re.escape(key(cue))+r'(?!\w)',key(gloss)))
def members(row,available):
 text=row.get('members_core','')
 if not text or text=='-':text=row.get('members','')
 return list(dict.fromkeys(key(x) for x in text.split(',') if key(x) in available and len(key(x))<=50 and len(key(x).split())<=3))
def audio(value):
 try:
  u=urlparse(value or '');return value if u.scheme=='https' and u.hostname in {'upload.wikimedia.org','commons.wikimedia.org'} else ''
 except ValueError:return ''
def lemma_of(gloss):
 if not re.match(r'^(Số (nhiều|ít)|Dạng |Động từ chia|Phân từ|Quá khứ)',gloss,re.I):return None
 match=re.search(r'của\s+(.+?)\.?$',gloss,re.I)
 return key(match[1]).strip(' ."') if match else None
def card(entry,cues,preferred_pos=(),lookup=None,require_context=False):
 source=entry
 def candidates(e):return [s for s in e.get('senses',[]) if s['language']=='vi' and not lemma_of(s['gloss']) and 1<=len(s['gloss'])<=240]
 senses=candidates(entry)
 # Resolve only an explicit source form-of statement; never guess roots by spelling.
 roots=[lemma_of(s['gloss']) for s in entry.get('senses',[]) if s['language']=='vi']
 if (not senses or require_context and not any(context_matches(c,s['gloss']) for c in cues for s in senses)) and lookup:
  for root in roots:
   if root in lookup and candidates(lookup[root]):source=lookup[root];senses=candidates(source);break
 if require_context and cues:senses=[s for s in senses if any(context_matches(c,s['gloss']) for c in cues)]
 # English-edition native Vietnamese translations remain source-derived, not generated.
 if not senses:
  for s in source.get('senses',[]):
   translations=s.get('translations',[]);gloss='; '.join(translations)
   if s['language']=='en' and 1<=len(gloss)<=240 and (not require_context or any(context_matches(c,gloss) for c in cues)):senses.append({**s,'gloss':gloss})
 if not senses:return None
 def score(s):
  return (sum(100 for cue in cues if context_matches(cue,s['gloss'])),int(s.get('pos') in preferred_pos),-next((i for i,x in enumerate(source['senses']) if x['id']==s['id']),0))
 s=max(senses,key=score)
 sounds=entry.get('sounds',[]);sound=next((x for x in sounds if audio(x.get('audio')) and 'US' in x.get('tags',[])),None) or next((x for x in sounds if audio(x.get('audio'))),{})
 ipa=sound.get('ipa') or next((x['ipa'] for x in sounds if x.get('ipa')),'')
 example=next((x for x in s.get('examples',[]) if len(x.get('text',''))<=350 and len(x.get('translation',''))<=350),{})
 return {'id':'tw-'+hashlib.sha256((key(entry['word'])+'|'+s['id']).encode()).hexdigest()[:16],
  'en':entry['word'],'vi':s['gloss'],'example':example.get('text',''),'exampleVi':example.get('translation',''),'exampleRef':example.get('ref','')[:500],
  'synonyms':s.get('synonyms',[])[:3],'antonyms':s.get('antonyms',[])[:3],
  'dictionary':{'source':'kaikki','word':source['word'],'senseId':s['id'],'language':s['language'],'meaningLanguage':'vi','pos':s.get('pos',''),'ipa':ipa,'audio':audio(sound.get('audio')),
   'sourceUrl':'https://'+('vi' if s['language']=='vi' else 'en')+'.wiktionary.org/wiki/'+quote(source['word']),'audioAttribution':sound.get('attribution','')}}

# These labels organize existing source groups; they do not invent memberships.
# tuple: source category, Vietnamese title, navigation group, preferred POS.
DECKS=[
 ('greetings','Chào hỏi','Giao tiếp',('intj',)),('family members','Gia đình','Giao tiếp',('noun',)),
 ('emotions','Cảm xúc','Giao tiếp',('adj','noun')),('personality traits','Tính cách','Giao tiếp',('adj',)),
 ('daily routine','Sinh hoạt hằng ngày','Nhà cửa',()),('household chores','Việc nhà','Nhà cửa',()),
 ('furniture','Nội thất','Nhà cửa',('noun',)),('household appliances','Đồ gia dụng','Nhà cửa',('noun',)),
 ('kitchen utensils','Dụng cụ nhà bếp','Nhà cửa',('noun',)),('bathroom items','Đồ dùng phòng tắm','Nhà cửa',('noun',)),
 ('bedroom','Phòng ngủ','Nhà cửa',('noun',)),('rooms','Các loại phòng','Nhà cửa',('noun',)),
 ('fruits','Trái cây','Ăn uống',('noun',)),('vegetables','Rau củ','Ăn uống',('noun',)),
 ('beverages','Đồ uống','Ăn uống',('noun',)),('breakfast foods','Bữa sáng','Ăn uống',('noun',)),
 ('baked goods','Bánh và đồ nướng','Ăn uống',('noun',)),('cooking','Nấu ăn','Ăn uống',('verb',)),
 ('tastes','Hương vị','Ăn uống',('adj',)),('restaurant items','Tại nhà hàng','Ăn uống',('noun',)),
 ('clothing','Quần áo','Cá nhân',('noun',)),('footwear','Giày dép','Cá nhân',('noun',)),
 ('accessories','Phụ kiện','Cá nhân',('noun',)),('facial features','Khuôn mặt','Cá nhân',('noun',)),
 ('hygiene supplies','Vệ sinh cá nhân','Cá nhân',('noun',)),('colors','Màu sắc','Cá nhân',('adj','noun')),
 ('shapes','Hình dạng','Cá nhân',('noun',)),('illnesses','Bệnh thường gặp','Sức khỏe',('noun',)),
 ('symptoms','Triệu chứng','Sức khỏe',('noun',)),('occupations','Nghề nghiệp','Học tập & công việc',('noun',)),
 ('office supplies','Đồ dùng văn phòng','Học tập & công việc',('noun',)),('school subjects','Môn học','Học tập & công việc',('noun',)),
 ('school supplies','Đồ dùng học tập','Học tập & công việc',('noun',)),('computer actions','Thao tác máy tính','Học tập & công việc',('verb',)),
 ('household electronics','Thiết bị điện tử','Học tập & công việc',('noun',)),
 ('shopping terms','Mua sắm','Mua sắm & tiền bạc',()),('shopping descriptors','Giá cả và chất lượng','Mua sắm & tiền bạc',('adj',)),
 ('money terms','Tiền bạc','Mua sắm & tiền bạc',('noun',)),('banking terms','Ngân hàng','Mua sắm & tiền bạc',('noun',)),
 ('travel essentials','Đồ dùng du lịch','Đi lại',('noun',)),('airport terms','Tại sân bay','Đi lại',('noun',)),
 ('hotel room','Ở khách sạn','Đi lại',('noun',)),('public transit','Giao thông công cộng','Đi lại',('noun',)),
 ('time expressions','Thời gian','Thế giới quanh ta',()),('days','Các ngày','Thế giới quanh ta',('noun',)),
 ('months','Các tháng','Thế giới quanh ta',('noun',)),('seasons','Các mùa','Thế giới quanh ta',('noun',)),
 ('weather','Thời tiết','Thế giới quanh ta',('noun','adj')),('farm animals','Động vật trang trại','Thế giới quanh ta',('noun',)),
 ('wild animals','Động vật hoang dã','Thế giới quanh ta',('noun',)),('birds','Các loài chim','Thế giới quanh ta',('noun',)),
 ('sports','Thể thao','Giải trí',('noun',)),('hobbies','Sở thích','Giải trí',()),
 ('musical instruments','Nhạc cụ','Giải trí',('noun',)),('outdoor activities','Hoạt động ngoài trời','Giải trí',())
]
# Reviewed English member selections and Vietnamese context anchors. Anchors are
# selection criteria only: app definitions must still come verbatim from Kaikki.
REVIEWED={name:{key(item.split('~',1)[0]):item.split('~',1)[1].split('/') for item in text.split(';') if '~' in item}
 for name,text in json.loads(Path(__file__).with_name('topic-selections.json').read_text(encoding='utf-8')).items()}

def build(source,kaikki,output):
 rows={key(r['category']):r for r in csv.DictReader(gzip.open(source,'rt',encoding='utf-8'),delimiter='\t')}
 index=json.load(gzip.open(kaikki/'index.json.gz','rt',encoding='utf-8'));available={key(r[0]) for r in index['entries']}
 selected={name:[w for w in members({'members':rows[name]['members']},available) if w in REVIEWED[name]] for name,_,_,_ in DECKS if name in rows}
 wanted=set(w for words in selected.values() for w in words);lookup={};by_word={key(r[0]):r for r in index['entries']}
 for _ in range(3):
  wanted.update(root for w in list(wanted) for gloss in by_word[w][1].split('\n') if (root:=lemma_of(gloss)) in available)
 for file in sorted(kaikki.glob('*.json.gz')):
  if file.name=='index.json.gz':continue
  shard=json.load(gzip.open(file,'rt',encoding='utf-8'))
  if shard['revision']!=index['revision']:raise ValueError('Mixed Kaikki revisions')
  lookup.update((w,e) for w,e in shard['entries'].items() if w in wanted)
 topics=[];used=set()
 for name,title,group,pos in DECKS:
  if name not in rows:raise ValueError('Missing source category '+name)
  words=[]
  for w in selected[name]:
   cues=REVIEWED[name][w]
   item=card(lookup[w],cues,pos,lookup=lookup,require_context=bool(cues)) if w in lookup else None
   if item and item['id'] not in {x['id'] for x in words}:words.append(item)
  if len(words)<3:continue
  slug=re.sub('[^a-z0-9]+','-',name).strip('-')
  topics.append({'id':slug,'title':title,'sourceLabel':rows[name]['category'],'group':group,'words':words})
  used.update(x['id'] for x in words)
 checksum=hashlib.sha256(source.read_bytes()).hexdigest()
 revision=hashlib.sha256((checksum+index['revision']+json.dumps(topics,ensure_ascii=False)).encode()).hexdigest()[:16]
 data={'version':1,'revision':revision,'source':'linguabase','dictionaryRevision':index['revision'],'topics':topics}
 output.mkdir(parents=True,exist_ok=True);(output/'catalog.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
 meta={k:v for k,v in data.items() if k!='topics'};meta.update({'sourceURL':'https://huggingface.co/datasets/linguabase/linguabase','sourceSHA256':checksum,'license':'CC0-1.0 (membership); Kaikki/Wiktionary licenses for card content','builtDate':'2026-10-24','topics':len(topics),'cards':sum(len(t['words']) for t in topics),'uniqueCards':len(used),'selection':'Named everyday source categories; reviewed source members and explicit context anchors; intersected with Kaikki; no invented words or definitions.'})
 (output/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'topics':len(topics),'cards':meta['cards'],'unique':len(used),'bytes':(output/'catalog.json').stat().st_size,'counts':{t['id']:len(t['words']) for t in topics}}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--kaikki',type=Path,default=Path('data/kaikki'));p.add_argument('--output',type=Path,default=Path('data/topics'));a=p.parse_args();build(a.source,a.kaikki,a.output)
