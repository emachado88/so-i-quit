"""Convert the RN i18n .ts files to flat JSON locale files.

- extracts "key": "value" pairs
- converts vue-i18n mustache {{x}} -> {x}
- keeps the en.json key order
- warns about missing/extra keys vs en.json
"""
import json
import pathlib
import re

FILES = {
    'pt': 'i18n/pt.ts',
    'fr': 'i18n/fr.ts',
    'es': 'i18n/es.ts',
    'it': 'i18n/it.ts',
    'zh': 'i18n/zh.ts',
    'de': 'i18n/de.ts',
    'nl': 'i18n/nl.ts',
}
EN_PATH = pathlib.Path('app/i18n/locales/en.json')
OUT_DIR = pathlib.Path('app/i18n/locales')


def extract_pairs(ts_text: str) -> dict[str, str]:
    pairs: dict[str, str] = {}
    for m in re.finditer(r'"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"', ts_text):
        key, value = m.group(1), m.group(2)
        value = value.replace('\\"', '"').replace('\\\\', '\\')
        value = re.sub(r'\{\{(\w+)\}\}', r'{\1}', value)
        pairs[key] = value
    return pairs


def main() -> None:
    en = json.loads(EN_PATH.read_text(encoding='utf-8'))
    en_keys = list(en.keys())
    ok = True
    for code, ts_path in FILES.items():
        text = pathlib.Path(ts_path).read_text(encoding='utf-8')
        pairs = extract_pairs(text)
        ordered = {k: pairs[k] for k in en_keys if k in pairs}
        missing = [k for k in en_keys if k not in pairs]
        extra = [k for k in pairs if k not in en_keys]
        if missing or extra:
            ok = False
            print(f'[WARN] {code}: missing={missing} extra={extra}')
        out = OUT_DIR / f'{code}.json'
        out.write_text(
            json.dumps(ordered, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8',
        )
        print(f'[OK] {code}: {len(ordered)} keys (en has {len(en_keys)})')
    if not ok:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
