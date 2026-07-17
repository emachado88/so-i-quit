/**
 * English translations — base language.
 * This object defines the shape all other languages must satisfy.
 */
const en = {
  // ── Tab bar ──
  "tabs.progress": "Progress",
  "tabs.habits": "Habits",
  "tabs.settings": "Settings",

  // ── Progress screen ──
  "progress.congratulations": "Congratulations!",
  "progress.readyToGetBetter": "Ready to get better?",
  "progress.doingGreat": "You're doing great,",
  "progress.noData": "No data saved in settings",
  "progress.goToHabits": "Go to habits",
  "progress.freeFor": "{{name}} free for",
  "progress.years": "years",
  "progress.months": "months",
  "progress.days": "days",
  "progress.hours": "hours",
  "progress.justStarted": "You've just started, keep going",
  "progress.totalSavings": "Total savings",
  "progress.since": "since {{date}}",
  "progress.failedToLoad": "Failed to load habits",

  // ── Habits screen ──
  "habits.title": "Habits",
  "habits.addNew": "Add New Habit",
  "habits.alcohol": "Alcohol",
  "habits.tobacco": "Tobacco",
  "habits.habitName": "Habit name",
  "habits.add": "Add",
  "habits.noHabits": "No habits added yet.",
  "habits.editDate": "Edit date",
  "habits.editSavings": "Edit savings",
  "habits.delete": "Delete",
  "habits.reset": "Reset",
  "habits.deleteTitle": "Delete {{name}}",
  "habits.deleteConfirm": "Are you sure you want to delete {{name}}?",
  "habits.enterName": "Please enter a habit name",
  "habits.errorTitle": "Error",
  "habits.failedToLoad": "Failed to load habits",
  "habits.failedToAdd": "Failed to add {{name}}",
  "habits.failedToAddCustom": "Failed to add custom habit",
  "habits.failedToSave": "Failed to save",
  "habits.failedToDelete": "Failed to delete {{name}}",
  "habits.failedToUpdateDate": "Failed to update date",
  "habits.failedToUpdateSavings": "Failed to update savings",

  // ── Settings screen ──
  "settings.title": "Settings",
  "settings.appearance": "Appearance",
  "settings.system": "System",
  "settings.light": "Light",
  "settings.dark": "Dark",
  "settings.language": "Language",
  "settings.currency": "Currency",
  "settings.searchCurrency": "Search currency…",
  "settings.failedTheme": "Failed to save theme preference",
  "settings.failedLanguage": "Failed to save language preference",
  "settings.failedCurrency": "Failed to save currency preference",

  // ── Savings modal ──
  "savings.title": "Daily Savings",
  "savings.titleOptional": "Daily Savings (optional)",
  "savings.subtitle": "How much do you save per day by quitting?",
  "savings.amount": "Amount",
  "savings.skip": "Skip",
  "savings.save": "Save",
  "savings.confirm": "Confirm",

  // ── Common ──
  "common.dismiss": "Dismiss",
  "common.perDay": "/day",
  "common.cancel": "Cancel",
} as const;

/** Union type of all translation keys. */
export type TranslationKey = keyof typeof en;

/** Shape every translation file must satisfy. */
export type Translations = Record<TranslationKey, string>;

export default en as Translations;
