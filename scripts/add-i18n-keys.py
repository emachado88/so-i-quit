"""Add new habit-screen i18n keys to every locale JSON."""
import json
import pathlib

LOCALES = pathlib.Path('app/i18n/locales')

# key -> translations (EN first, then pt/fr/es/it/zh/de/nl in file order)
NEW_KEYS = {
    'habits.date': {
        'en': 'Date',
        'pt': 'Data',
        'fr': 'Date',
        'es': 'Fecha',
        'it': 'Data',
        'zh': '日期',
        'de': 'Datum',
        'nl': 'Datum',
    },
    'habits.time': {
        'en': 'Time',
        'pt': 'Hora',
        'fr': 'Heure',
        'es': 'Hora',
        'it': 'Ora',
        'zh': '时间',
        'de': 'Uhrzeit',
        'nl': 'Tijd',
    },
    'habits.relapseConfirm': {
        'en': 'Log a relapse for {name}? This restarts your streak from today.',
        'pt': 'Registar uma recaída para {name}? Isto recomeça a tua sequência a partir de hoje.',
        'fr': 'Enregistrer une rechute pour {name} ? Cela redémarre votre série à partir d\'aujourd\'hui.',
        'es': '¿Registrar una recaída para {name}? Esto reinicia tu racha desde hoy.',
        'it': 'Registrare una ricaduta per {name}? Questo riavvia la tua serie da oggi.',
        'zh': '为{name}记录一次复发？这将从今天重新开始你的连续记录。',
        'de': 'Rückfall für {name} protokollieren? Das startet deine Serie ab heute neu.',
        'nl': 'Een terugval voor {name} registreren? Dit herstart je reeks vanaf vandaag.',
    },
}

for path in sorted(LOCALES.glob('*.json')):
    code = path.stem
    data = json.loads(path.read_text(encoding='utf-8'))
    for key, by_lang in NEW_KEYS.items():
        if key in data:
            print(f'[SKIP] {code}: {key} already present')
            continue
        # insert after habits.addCustom when present, else append
        anchor = 'habits.addCustom'
        if anchor in data:
            items = list(data.items())
            idx = items.index((anchor, data[anchor]))
            items.insert(idx + 1, (key, by_lang[code]))
            data = dict(items)
        else:
            data[key] = by_lang[code]
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    print(f'[OK] {code}: {len(data)} keys')

# validate: all locales share the same key set
sets = {
    p.stem: set(json.loads(p.read_text(encoding='utf-8')).keys())
    for p in LOCALES.glob('*.json')
}
en_keys = sets['en']
for code, keys in sets.items():
    if keys != en_keys:
        raise SystemExit(
            f'[WARN] {code} key set differs: missing={en_keys - keys} extra={keys - en_keys}'
        )
print('[OK] all key sets identical')
