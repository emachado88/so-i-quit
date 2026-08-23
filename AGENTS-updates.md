# AGENTS.md updates — proposed for review

> Ticket: `minor-consistency-docs-freshness` (branch `fix/minor-consistency`)
> Per the worktree convention, sub-agents never edit `AGENTS.md` directly.
> This file carries the proposed change; the parent applies it to `AGENTS.md`
> at review/merge time, then deletes this file.

## Change

File: `AGENTS.md` — Project Structure, `app/composables/` block
(~lines 42–45). Currently lists `useNow.ts`, `useThemeMode.ts`,
`useLocaleSwitch.ts`. Two composables that exist on disk and are referenced
in code are missing; add:

```diff
   composables/
     useNow.ts              # 1s ticking Date ref (live counters) — cleanup in onUnmounted
     useThemeMode.ts        # color-mode binding
     useLocaleSwitch.ts     # i18n locale switching
+    useFocusTrap.ts        # focus trap for modal dialogs (WizardModal) — Tab cycles within, restores focus on close
+    useExactAlarmPrompt.ts # module-level singleton for the exact-alarm re-ask dialog — survives page re-creation (tab switch / locale navigation mid-import)
   plugins/
```

References: `useFocusTrap.ts` — `app/components/habits/WizardModal.vue`;
`useExactAlarmPrompt.ts` — `app/pages/settings.vue`, `app/pages/habits.vue`.