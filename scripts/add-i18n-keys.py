"""Add new habit-screen i18n keys to every locale JSON."""
import json
import pathlib

LOCALES = pathlib.Path('app/i18n/locales')

# key -> translations (EN first, then pt/fr/es/it/zh/de/nl in file order)
NEW_KEYS = {
    'error.title': {
        'en': 'Something went wrong',
        'pt': 'Algo correu mal',
        'fr': 'Une erreur est survenue',
        'es': 'Algo salió mal',
        'it': 'Qualcosa è andato storto',
        'zh': '出错了',
        'de': 'Etwas ist schiefgelaufen',
        'nl': 'Er ging iets mis',
    },
    'error.body': {
        'en': 'The screen could not be rendered. Your data is safe — reload to try again.',
        'pt': 'O ecrã não pôde ser apresentado. Os teus dados estão seguros — recarrega para tentar novamente.',
        'fr': "L'écran n'a pas pu être affiché. Vos données sont en sécurité — rechargez pour réessayer.",
        'es': 'La pantalla no pudo mostrarse. Tus datos están a salvo: recarga para intentarlo de nuevo.',
        'it': 'La schermata non può essere visualizzata. I tuoi dati sono al sicuro: ricarica per riprovare.',
        'zh': '无法显示此屏幕。你的数据是安全的——重新加载即可重试。',
        'de': 'Der Bildschirm konnte nicht gerendert werden. Deine Daten sind sicher – lade neu, um es erneut zu versuchen.',
        'nl': 'Het scherm kon niet worden weergegeven. Je gegevens zijn veilig — herlaad om het opnieuw te proberen.',
    },
    'error.reload': {
        'en': 'Reload',
        'pt': 'Recarregar',
        'fr': 'Recharger',
        'es': 'Recargar',
        'it': 'Ricarica',
        'zh': '重新加载',
        'de': 'Neu laden',
        'nl': 'Herladen',
    },
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
    'settings.data': {
        'en': 'Data',
        'pt': 'Dados',
        'fr': 'Données',
        'es': 'Datos',
        'it': 'Dati',
        'zh': '数据',
        'de': 'Daten',
        'nl': 'Gegevens',
    },
    'settings.dataDescription': {
        'en': 'Export your data as a backup file, or restore a previous backup.',
        'pt': 'Exporta os teus dados como ficheiro de backup, ou restaura um backup anterior.',
        'fr': 'Exportez vos données dans un fichier de sauvegarde, ou restaurez une sauvegarde précédente.',
        'es': 'Exporta tus datos como archivo de respaldo, o restaura una copia anterior.',
        'it': 'Esporta i tuoi dati come file di backup o ripristina un backup precedente.',
        'zh': '将你的数据导出为备份文件，或恢复之前的备份。',
        'de': 'Exportiere deine Daten als Backup-Datei oder stelle ein früheres Backup wieder her.',
        'nl': 'Exporteer je gegevens als back-upbestand of herstel een eerdere back-up.',
    },
    'settings.exportData': {
        'en': 'Export data',
        'pt': 'Exportar dados',
        'fr': 'Exporter les données',
        'es': 'Exportar datos',
        'it': 'Esporta dati',
        'zh': '导出数据',
        'de': 'Daten exportieren',
        'nl': 'Gegevens exporteren',
    },
    'settings.importData': {
        'en': 'Import data',
        'pt': 'Importar dados',
        'fr': 'Importer les données',
        'es': 'Importar datos',
        'it': 'Importa dati',
        'zh': '导入数据',
        'de': 'Daten importieren',
        'nl': 'Gegevens importeren',
    },
    'settings.exportFailed': {
        'en': 'Export failed. Please try again.',
        'pt': 'Falha na exportação. Tenta novamente.',
        'fr': 'Échec de l\'exportation. Réessayez.',
        'es': 'Error al exportar. Inténtalo de nuevo.',
        'it': 'Esportazione non riuscita. Riprova.',
        'zh': '导出失败。请重试。',
        'de': 'Export fehlgeschlagen. Bitte versuche es erneut.',
        'nl': 'Exporteren mislukt. Probeer het opnieuw.',
    },
    'settings.importInvalid': {
        'en': 'This file is not a valid So I Quit backup.',
        'pt': 'Este ficheiro não é um backup válido do So I Quit.',
        'fr': 'Ce fichier n\'est pas une sauvegarde So I Quit valide.',
        'es': 'Este archivo no es una copia de seguridad válida de So I Quit.',
        'it': 'Questo file non è un backup So I Quit valido.',
        'zh': '此文件不是有效的 So I Quit 备份。',
        'de': 'Diese Datei ist kein gültiges So I Quit-Backup.',
        'nl': 'Dit bestand is geen geldige So I Quit-back-up.',
    },
    'settings.importDone': {
        'en': 'Backup restored.',
        'pt': 'Backup restaurado.',
        'fr': 'Sauvegarde restaurée.',
        'es': 'Copia de seguridad restaurada.',
        'it': 'Backup ripristinato.',
        'zh': '备份已恢复。',
        'de': 'Backup wiederhergestellt.',
        'nl': 'Back-up hersteld.',
    },
    'settings.importDialogTitle': {
        'en': 'Restore backup?',
        'pt': 'Restaurar backup?',
        'fr': 'Restaurer la sauvegarde ?',
        'es': '¿Restaurar la copia de seguridad?',
        'it': 'Ripristinare il backup?',
        'zh': '恢复备份？',
        'de': 'Backup wiederherstellen?',
        'nl': 'Back-up herstellen?',
    },
    'settings.importDialogMessage': {
        'en': 'This replaces all your current habits, milestones and settings. This cannot be undone.',
        'pt': 'Isto substitui todos os teus hábitos, marcos e definições atuais. Esta ação não pode ser anulada.',
        'fr': 'Cela remplace tous vos habitudes, jalons et réglages actuels. Cette action est irréversible.',
        'es': 'Esto reemplaza todos tus hábitos, hitos y ajustes actuales. Esta acción no se puede deshacer.',
        'it': 'Questo sostituisce tutti i tuoi abitudini, traguardi e impostazioni attuali. Questa azione non può essere annullata.',
        'zh': '这将替换你当前的所有习惯、里程碑和设置。此操作无法撤销。',
        'de': 'Dies ersetzt alle deine aktuellen Gewohnheiten, Meilensteine und Einstellungen. Diese Aktion kann nicht rückgängig gemacht werden.',
        'nl': 'Dit vervangt al je huidige gewoontes, mijlpalen en instellingen. Deze actie kan niet ongedaan worden gemaakt.',
    },
    'settings.importDialogConfirm': {
        'en': 'Restore',
        'pt': 'Restaurar',
        'fr': 'Restaurer',
        'es': 'Restaurar',
        'it': 'Ripristina',
        'zh': '恢复',
        'de': 'Wiederherstellen',
        'nl': 'Herstellen',
    },
    'settings.exportShareDialog': {
        'en': 'Save or share your backup',
        'pt': 'Guarda ou partilha o teu backup',
        'fr': 'Enregistrez ou partagez votre sauvegarde',
        'es': 'Guarda o comparte tu copia de seguridad',
        'it': 'Salva o condividi il tuo backup',
        'zh': '保存或分享你的备份',
        'de': 'Backup speichern oder teilen',
        'nl': 'Bewaar of deel je back-up',
    },
    'settings.exportDone': {
        'en': 'Backup exported.',
        'pt': 'Backup exportado.',
        'fr': 'Sauvegarde exportée.',
        'es': 'Copia de seguridad exportada.',
        'it': 'Backup esportato.',
        'zh': '备份已导出。',
        'de': 'Backup exportiert.',
        'nl': 'Back-up geëxporteerd.',
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
