"""Build offline, sense-preserving lookup shards from the official OEWN JSON ZIP.

Usage: python tools/build-wordnet.py path/to/english-wordnet-2025-json.zip
The original ZIP is an input, not part of the initial PWA download.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse, collections, gzip, hashlib, json, re, unicodedata

ROOT = Path(__file__).resolve().parents[1]

def bucket(word):
    first = ''.join(c for c in unicodedata.normalize('NFD', word.lower()) if not unicodedata.combining(c))[:1]
    return first if first in 'abcdefghijklmnopqrstuvwxyz' else '0'

def build(source, output):
    entries, concepts = {}, {}
    with ZipFile(source) as archive:
        for name in archive.namelist():
            if not name.endswith('.json'): continue
            target = entries if name.startswith('entries-') else concepts
            target.update(json.loads(archive.read(name)))
    senses, members = {}, {}
    for word, parts in entries.items():
        for pos, part in parts.items():
            for sense in part.get('sense', []):
                senses[sense['id']] = (word, pos, sense)
                members[(word, sense['synset'])] = sense['id']
    def reference(sense_id):
        if sense_id not in senses: return None
        return {'word': senses[sense_id][0], 'sense': sense_id}
    def refs(ids, own):
        result, seen = [], set()
        for sid in ids:
            ref = reference(sid)
            if ref and sid not in seen and sid != own:
                seen.add(sid); result.append(ref)
        return result
    def concept_members(concept_id):
        result = []
        for member in concepts.get(concept_id, {}).get('members', []):
            word = member if isinstance(member, str) else member['word']
            sid = members.get((word, concept_id))
            if sid: result.append(sid)
        return result
    shards, forms, lemmas = {}, {}, {}
    counts = collections.Counter()
    for word, parts in sorted(entries.items()):
        record = {'word': word, 'forms': {}, 'pronunciation': [], 'senses': []}
        lemmas[word.lower()] = ''.join(sorted(set(lemmas.get(word.lower(), '') + ''.join(parts))))
        for pos, part in parts.items():
            if part.get('form'):
                record['forms'][pos] = part['form']
                for form in part['form']:
                    roots = forms.setdefault(form.lower(), [])
                    if word not in roots: roots.append(word)
            for pronunciation in part.get('pronunciation', []):
                if pronunciation not in record['pronunciation']: record['pronunciation'].append(pronunciation)
            for sense in part.get('sense', []):
                concept = concepts[sense['synset']]
                sid = sense['id']
                synonyms = refs(concept_members(sense['synset']), sid)
                similar_ids = [i for c in concept.get('similar', []) for i in concept_members(c)] if pos in ('a', 's') else []
                related_ids = sense.get('also', []) + sense.get('derivation', [])
                data = {'id': sid, 'concept': sense['synset'], 'pos': pos,
                        'definition': ' '.join(concept.get('definition', [])),
                        'examples': concept.get('example', []),
                        'synonyms': synonyms, 'similar': refs(similar_ids, sid),
                        'antonyms': refs(sense.get('antonym', []), sid),
                        'related': refs(related_ids, sid)}
                record['senses'].append(data)
                counts['senses'] += 1
                for kind in ('synonyms', 'similar', 'antonyms', 'related'): counts[kind] += len(data[kind])
        key = bucket(word)
        shards.setdefault(key, {})[word] = record
    output.mkdir(parents=True, exist_ok=True)
    def save(name, data):
        raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
        (output / (name + '.json.gz')).write_bytes(gzip.compress(raw, mtime=0))
    for key, records in shards.items(): save(key, {'version': 1, 'entries': records})
    manifest = {'version': 1, 'count': len(entries), 'stats': dict(counts),
                'buckets': sorted(shards), 'forms': forms, 'lemmas': lemmas,
                'aliases': {word.lower(): word for word in entries if word.lower() not in entries},
                'source': {'name': 'Open English WordNet 2025', 'url': 'https://en-word.net/downloads',
                           'download': 'https://en-word.net/static/english-wordnet-2025-json.zip',
                           'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                           'license': 'CC-BY-4.0 + Princeton WordNet License',
                           'changes': 'Grouped by headword; retained exact sense identifiers; extracted synonyms, adjective similarity, direct antonyms, derivations and explicit forms; compressed into alphabetical shards.'}}
    save('index', manifest)
    (output / 'source.json').write_text(json.dumps({k: manifest[k] for k in ('version', 'count', 'stats', 'source')}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'words': len(entries), **counts, 'compressed_bytes': sum(p.stat().st_size for p in output.glob('*.gz'))}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'data/wordnet')
    args = parser.parse_args()
    build(args.source, args.output)
