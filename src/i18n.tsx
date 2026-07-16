import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DateLocale } from './utils/time';

export type Lang = 'fr' | 'en';

const LANG_KEY = 'timesheet.lang';

const dict = {
  fr: {
    // Navigation
    'nav.summary': 'Résumé',
    'nav.details': 'Détails',
    // Résumé
    'summary.title': 'TimeSheet ⚡',
    'summary.thisWeek': 'Cette semaine',
    'summary.thisWeekSub': 'Heures supp saisies cette semaine',
    'summary.thisMonth': 'Ce mois',
    'summary.thisMonthSub': 'Heures supp saisies ce mois',
    'summary.oncallMonth': '🛡️ Astreintes ce mois',
    'summary.oncallMonthSub': "Jours d'astreinte prestés ce mois",
    'summary.days': '{n} jour',
    'summary.daysPlural': '{n} jours',
    'summary.recent': '📜 Derniers enchantements',
    'summary.empty': 'Aucun sortilège lancé. Accio heures supp ! 🪄',
    'summary.addLabel': 'Ajouter une entrée',
    // Détails
    'details.title': 'Détails 📜',
    'details.total': '🧙 Total cumulé',
    'details.totalHelp': 'Chaque heure supp est divisée par 8 (1 journée = 1)',
    'details.oncallTotal': "🛡️ {n} jour d'astreinte",
    'details.oncallTotalPlural': "🛡️ {n} jours d'astreinte",
    'details.empty': 'Aucune entrée pour le moment.',
    'details.deleteConfirm': 'Supprimer cette entrée ?',
    // Carte d'entrée
    'entry.oncall': 'Astreinte 🛡️',
    'entry.edit': 'Modifier',
    'entry.delete': 'Supprimer',
    // Formulaire
    'form.newEntry': 'Nouvelle entrée 🪄',
    'form.newOncall': 'Nouvelle astreinte 🛡️',
    'form.editEntry': "Modifier l'entrée ✨",
    'form.editOncall': "Modifier l'astreinte ✨",
    'form.cancel': 'Annuler',
    'form.kindOvertime': '⚡ Heure supp',
    'form.kindOncall': '🛡️ Astreinte',
    'form.date': 'Date',
    'form.from': 'Du',
    'form.to': 'Au',
    'form.hours': 'Heures',
    'form.minutes': 'Minutes',
    'form.resetLabel': 'Réinitialiser la durée',
    'form.oncallHint': "🛡️ Un jour d'astreinte compte pour 1 jour — pas de durée à saisir.",
    'form.note': 'Note (optionnel)',
    'form.notePlaceholder': 'Contexte, projet, client…',
    'form.save': 'Enregistrer',
    'form.errInvalid': 'Valeurs invalides. Heures 0–23, minutes 0–59.',
    'form.errEmpty': 'Renseigne au moins une minute.',
    'form.errRange': 'La date de début doit précéder la date de fin.',
    'form.errRangeTooLong': 'Période trop longue (92 jours maximum).',
    // Export / import
    'export.button': 'Exporter',
    'export.period': 'Période',
    'export.thisMonth': 'Ce mois-ci',
    'export.lastMonth': 'Mois dernier',
    'export.file': 'Fichier',
    'export.mail': 'Mail 🦉',
    'export.backup': 'Sauvegarde complète (JSON)',
    'export.import': 'Importer',
    'export.errRange': 'La date de début doit précéder la date de fin.',
    'export.emptyRange': 'Aucune magie détectée dans cette période 🔮',
    'export.failed': 'Export échoué : {msg}',
    'export.backupFailed': 'Sauvegarde échouée : {msg}',
    'export.importConfirm': 'Importer ce fichier remplacera toutes les entrées actuelles. Continuer ?',
    'export.importOk': 'Import réussi ✓',
    'export.importFailed': 'Import échoué : {msg}',
    // Mise à jour
    'update.available': "Un hibou t'apporte une mise à jour 🦉",
    'update.hint': 'Télécharge puis ouvre le fichier pour installer.',
    'update.download': 'Télécharger',
    'update.opening': 'Ouverture…',
    'update.check': 'Vérifier les mises à jour',
    'update.checking': 'Vérification…',
    'update.upToDate': 'Application à jour ✓ (version {v})',
    'update.checkFailed': 'Vérification impossible — connexion internet indisponible ou GitHub inaccessible.',
    'update.failed': 'Mise à jour échouée : {msg}',
    'update.version': 'Version {v}',
  },
  en: {
    'nav.summary': 'Summary',
    'nav.details': 'Details',
    'summary.title': 'TimeSheet ⚡',
    'summary.thisWeek': 'This week',
    'summary.thisWeekSub': 'Overtime logged this week',
    'summary.thisMonth': 'This month',
    'summary.thisMonthSub': 'Overtime logged this month',
    'summary.oncallMonth': '🛡️ On-call this month',
    'summary.oncallMonthSub': 'On-call days served this month',
    'summary.days': '{n} day',
    'summary.daysPlural': '{n} days',
    'summary.recent': '📜 Latest enchantments',
    'summary.empty': 'No spells cast yet. Accio overtime! 🪄',
    'summary.addLabel': 'Add an entry',
    'details.title': 'Details 📜',
    'details.total': '🧙 Grand total',
    'details.totalHelp': 'Each overtime hour is divided by 8 (1 workday = 1)',
    'details.oncallTotal': '🛡️ {n} on-call day',
    'details.oncallTotalPlural': '🛡️ {n} on-call days',
    'details.empty': 'No entries yet.',
    'details.deleteConfirm': 'Delete this entry?',
    'entry.oncall': 'On-call 🛡️',
    'entry.edit': 'Edit',
    'entry.delete': 'Delete',
    'form.newEntry': 'New entry 🪄',
    'form.newOncall': 'New on-call 🛡️',
    'form.editEntry': 'Edit entry ✨',
    'form.editOncall': 'Edit on-call ✨',
    'form.cancel': 'Cancel',
    'form.kindOvertime': '⚡ Overtime',
    'form.kindOncall': '🛡️ On-call',
    'form.date': 'Date',
    'form.from': 'From',
    'form.to': 'To',
    'form.hours': 'Hours',
    'form.minutes': 'Minutes',
    'form.resetLabel': 'Reset duration',
    'form.oncallHint': '🛡️ An on-call day counts as 1 day — no duration to enter.',
    'form.note': 'Note (optional)',
    'form.notePlaceholder': 'Context, project, client…',
    'form.save': 'Save',
    'form.errInvalid': 'Invalid values. Hours 0–23, minutes 0–59.',
    'form.errEmpty': 'Enter at least one minute.',
    'form.errRange': 'The start date must come before the end date.',
    'form.errRangeTooLong': 'Period too long (92 days maximum).',
    'export.button': 'Export',
    'export.period': 'Period',
    'export.thisMonth': 'This month',
    'export.lastMonth': 'Last month',
    'export.file': 'File',
    'export.mail': 'Mail 🦉',
    'export.backup': 'Full backup (JSON)',
    'export.import': 'Import',
    'export.errRange': 'The start date must come before the end date.',
    'export.emptyRange': 'No magic detected in this period 🔮',
    'export.failed': 'Export failed: {msg}',
    'export.backupFailed': 'Backup failed: {msg}',
    'export.importConfirm': 'Importing this file will replace all current entries. Continue?',
    'export.importOk': 'Import successful ✓',
    'export.importFailed': 'Import failed: {msg}',
    'update.available': 'An owl brings you an update 🦉',
    'update.hint': 'Download, then open the file to install.',
    'update.download': 'Download',
    'update.opening': 'Opening…',
    'update.check': 'Check for updates',
    'update.checking': 'Checking…',
    'update.upToDate': 'App is up to date ✓ (version {v})',
    'update.checkFailed': 'Check failed — no internet connection or GitHub unreachable.',
    'update.failed': 'Update failed: {msg}',
    'update.version': 'Version {v}',
  },
} as const;

export type TKey = keyof (typeof dict)['fr'];

function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return raw === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

type I18n = {
  lang: Lang;
  locale: DateLocale;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function translate(
  lang: Lang,
  key: TKey,
  vars?: Record<string, string | number>,
): string {
  const table: Record<string, string> = dict[lang];
  let out = table[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // storage unavailable: language just won't persist
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      locale: lang === 'fr' ? 'fr-FR' : 'en-US',
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LangProvider');
  return ctx;
}
