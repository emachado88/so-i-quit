"""Add new habit-screen i18n keys to every locale JSON."""
import json
import pathlib

LOCALES = pathlib.Path('app/i18n/locales')

# key -> translations (EN first, then pt/fr/es/it/zh/de/nl in file order)
NEW_KEYS = {
    'updates.title': {
        'en': 'Updates',
        'pt': 'Atualizações',
        'fr': 'Mises à jour',
        'es': 'Actualizaciones',
        'it': 'Aggiornamenti',
        'zh': '更新',
        'de': 'Aktualisierungen',
        'nl': 'Updates',
    },
    'updates.description': {
        'en': 'Check for a newer version of So I Quit and install it.',
        'pt': 'Verifica se existe uma versão mais recente do So I Quit e instala-a.',
        'fr': "Vérifiez s'il existe une version plus récente de So I Quit et installez-la.",
        'es': 'Comprueba si hay una versión más reciente de So I Quit e instálala.',
        'it': 'Controlla se esiste una versione più recente di So I Quit e installala.',
        'zh': '检查 So I Quit 是否有新版本并安装。',
        'de': 'Prüfe, ob eine neuere Version von So I Quit verfügbar ist, und installiere sie.',
        'nl': 'Controleer of er een nieuwere versie van So I Quit is en installeer deze.',
    },
    'updates.check': {
        'en': 'Check for updates',
        'pt': 'Verificar atualizações',
        'fr': 'Rechercher des mises à jour',
        'es': 'Buscar actualizaciones',
        'it': 'Controlla aggiornamenti',
        'zh': '检查更新',
        'de': 'Nach Updates suchen',
        'nl': 'Controleren op updates',
    },
    'updates.checking': {
        'en': 'Checking for updates…',
        'pt': 'A verificar atualizações…',
        'fr': 'Recherche de mises à jour…',
        'es': 'Buscando actualizaciones…',
        'it': 'Controllo aggiornamenti…',
        'zh': '正在检查更新…',
        'de': 'Suche nach Updates…',
        'nl': 'Controleren op updates…',
    },
    'updates.upToDate': {
        'en': "You're on the latest version.",
        'pt': 'Estás na versão mais recente.',
        'fr': 'Vous avez la dernière version.',
        'es': 'Tienes la última versión.',
        'it': "Hai l'ultima versione.",
        'zh': '你已是最新版本。',
        'de': 'Du hast die neueste Version.',
        'nl': 'Je hebt de nieuwste versie.',
    },
    'updates.available': {
        'en': 'Version {version} is available.',
        'pt': 'A versão {version} está disponível.',
        'fr': 'La version {version} est disponible.',
        'es': 'La versión {version} está disponible.',
        'it': 'La versione {version} è disponibile.',
        'zh': '版本 {version} 已可用。',
        'de': 'Version {version} ist verfügbar.',
        'nl': 'Versie {version} is beschikbaar.',
    },
    'updates.download': {
        'en': 'Download',
        'pt': 'Transferir',
        'fr': 'Télécharger',
        'es': 'Descargar',
        'it': 'Scarica',
        'zh': '下载',
        'de': 'Herunterladen',
        'nl': 'Downloaden',
    },
    'updates.downloading': {
        'en': 'Downloading update…',
        'pt': 'A transferir atualização…',
        'fr': "Téléchargement de la mise à jour…",
        'es': 'Descargando actualización…',
        'it': "Download dell'aggiornamento…",
        'zh': '正在下载更新…',
        'de': 'Update wird heruntergeladen…',
        'nl': 'Update downloaden…',
    },
    'updates.installHint': {
        'en': 'Download complete. Follow the prompts to install.',
        'pt': 'Transferência concluída. Segue as instruções para instalar.',
        'fr': 'Téléchargement terminé. Suivez les instructions pour installer.',
        'es': 'Descarga completada. Sigue las instrucciones para instalar.',
        'it': 'Download completato. Segui le istruzioni per installare.',
        'zh': '下载完成。请按提示安装。',
        'de': 'Download abgeschlossen. Folge den Anweisungen zur Installation.',
        'nl': 'Download voltooid. Volg de aanwijzingen om te installeren.',
    },
    'updates.failed': {
        'en': "Couldn't check for updates.",
        'pt': 'Não foi possível verificar atualizações.',
        'fr': 'Impossible de rechercher les mises à jour.',
        'es': 'No se pudieron buscar actualizaciones.',
        'it': 'Impossibile controllare gli aggiornamenti.',
        'zh': '无法检查更新。',
        'de': 'Updates konnten nicht geprüft werden.',
        'nl': 'Kon niet controleren op updates.',
    },
    'updates.downloadFailed': {
        'en': 'Download failed. Please try again.',
        'pt': 'Falha na transferência. Tenta novamente.',
        'fr': 'Échec du téléchargement. Réessayez.',
        'es': 'Error al descargar. Inténtalo de nuevo.',
        'it': 'Download non riuscito. Riprova.',
        'zh': '下载失败。请重试。',
        'de': 'Download fehlgeschlagen. Bitte versuche es erneut.',
        'nl': 'Download mislukt. Probeer het opnieuw.',
    },
    'updates.bannerTitle': {
        'en': 'Update available',
        'pt': 'Atualização disponível',
        'fr': 'Mise à jour disponible',
        'es': 'Actualización disponible',
        'it': 'Aggiornamento disponibile',
        'zh': '有可用更新',
        'de': 'Update verfügbar',
        'nl': 'Update beschikbaar',
    },
    'updates.bannerBody': {
        'en': 'Version {version} is ready to install.',
        'pt': 'A versão {version} está pronta a instalar.',
        'fr': 'La version {version} est prête à être installée.',
        'es': 'La versión {version} está lista para instalar.',
        'it': "La versione {version} è pronta per l'installazione.",
        'zh': '版本 {version} 已准备好安装。',
        'de': 'Version {version} kann installiert werden.',
        'nl': 'Versie {version} is klaar om te installeren.',
    },
}

for path in sorted(LOCALES.glob('*.json')):
    code = path.stem
    data = json.loads(path.read_text(encoding='utf-8'))
    for key, by_lang in NEW_KEYS.items():
        if key in data:
            print(f'[SKIP] {code}: {key} already present')
            continue
        # insert after tabs.settings when present, else append
        anchor = 'tabs.settings'
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
