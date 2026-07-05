import { appName } from '../config/app.config';

export const strings = {
  appName,
  nav: {
    setup: 'Einrichtung',
    registration: 'Schützen',
    scoring: 'Erfassung',
    results: 'Ergebnisse',
  },
  updateBanner: { body: 'Ein Update ist verfügbar.', confirm: 'Aktualisieren', dismiss: 'Später' },
  placeholder: {
    heading: (section: string) => `${section} kommt bald`,
    body: 'Diese Funktion wird in einer kommenden Version freigeschaltet.',
  },
  theme: {
    ariaToDark: 'Zu Dunkelmodus wechseln',
    ariaToLight: 'Zu Hellmodus wechseln',
  },
  // WR-04: shared fallback error message surfaced whenever a Dexie write throws (e.g.
  // storage quota exceeded, blocked version upgrade) so a failed save is never silent.
  common: {
    saveError: 'Speichern fehlgeschlagen: {error}',
  },
  // Phase 2 sections (setup/registration/presets) — added verbatim from
  // 02-UI-SPEC.md's "Strings Module Extension" block. This is the ONLY plan in Phase 2
  // that edits this file; Plans 02/03/04 only ever import from it.
  setup: {
    heading: 'Klassen',
    addClassHeading: 'Klasse hinzufügen',
    ageLabel: 'Alter',
    ageOptions: ['U12', 'U14', 'U16', 'U18', 'Erwachsene'],
    ageCustom: 'Andere',
    bowTypeLabel: 'Bogentyp',
    bowTypeOptions: ['Recurve', 'trad. Recurve', 'Langbogen', 'Blankbogen', 'Compound'],
    bowTypeCustom: 'Andere',
    distanceLabel: 'Entfernung',
    distanceOptions: ['10m', '18m', '25m', '70m'],
    distanceCustom: 'Andere',
    classNameLabel: 'Klassenname',
    classNameCollisionSuffix: '(Entfernung unterscheidet)',
    addClassButton: 'Klasse hinzufügen',
    linesLabel: 'Schießplätze',
    linesHelper: 'Anzahl der Schießplätze für das Turnier',
    roundsLabel: 'Runden und Passen',
    waPresetsLabel: 'WA-Vorlagen',
    customLabel: 'Benutzerdefiniert',
    wa18m: 'WA 18m — 10 Passen à 3 Pfeile (30 gesamt)',
    wa25m: 'WA 25m — 10 Passen à 3 Pfeile (30 gesamt)',
    wa70m: 'WA 70m — 6 Passen à 6 Pfeile (36 gesamt)',
    roundsCountLabel: 'Runden',
    passesPerRoundLabel: 'Passen pro Runde',
    arrowsPerPassLabel: 'Pfeile pro Passe',
    customDistanceLabel: 'Entfernung',
    saveButton: 'Speichern',
    // Additions beyond the UI-SPEC verbatim block — needed for the Classes card's
    // inline delete-confirmation row (plan Task 2 action text); not itself listed in
    // 02-UI-SPEC.md's Strings Module Extension code block.
    classDeleteAction: 'Löschen',
    classDeleteConfirm: (name: string) => `Klasse '${name}' löschen?`,
    classDeleteConfirmYes: 'Ja, löschen',
    classDeleteCancel: 'Abbrechen',
    // CR-02: shown instead of the delete-confirmation row when shooters still
    // reference this class, so the trainer isn't left with a silently broken roster.
    classDeleteBlocked: (count: number) =>
      `Löschen nicht möglich: ${count} Schütze(n) sind dieser Klasse zugeordnet.`,
  },
  registration: {
    heading: 'Schützen',
    addShooterHeading: 'Schütze hinzufügen',
    nameLabel: 'Name',
    classLabel: 'Klasse',
    classRequired: '(erforderlich)',
    lineLabel: 'Schießplatz (optional)',
    lineHelper: 'Wird automatisch vergeben, falls leer gelassen.',
    modeAB: 'Modus: AB',
    modeABExplain: 'Bis 2 Schützen pro Schießplatz (A, B)',
    modeABCD: 'Modus: AB/CD',
    modeABCDExplain: '4 Schützen pro Schießplatz, zwei Durchgänge (A/B, C/D)',
    addShooterButton: 'Schütze hinzufügen',
    tableNameColumn: 'Name',
    tableClassColumn: 'Klasse',
    tableLineColumn: 'Schießplatz',
    editAction: 'Bearbeiten',
    deleteAction: 'Löschen',
    emptyHeading: 'Schütze hinzufügen',
    emptyBody: 'Noch keine Schützen registriert.',
    autoAssignModalTitle: 'Schützen zugewiesen',
    autoAssignModalBody: '{count} Schützen werden automatisch zugewiesen:',
    autoAssignModalLines: 'Schießplätze: {lines}',
    autoAssignModalRationale:
      '(Verteilung nach Anmeldereihenfolge, ausgewogen über alle Schießplätze)',
    autoAssignSaveButton: 'Speichern',
    autoAssignBackButton: 'Zurück',
    autoAssignHint:
      'Sie können Schießplätze manuell ändern, bevor Sie speichern. Zurück drücken, um zu editieren.',
  },
  presets: {
    heading: 'Vorlagen',
    saveHeading: 'Neue Vorlage speichern',
    nameLabel: 'Vorlagenname',
    nameHelper: 'z.B. "Sommermeisters 2026"',
    capacityIndicator: '{count} von 8 Vorlagen gespeichert',
    capacityWarning: 'Maximum 8 Vorlagen. Löschen Sie eine Vorlage, bevor Sie speichern.',
    saveButton: 'Speichern',
    collisionConfirm: 'Vorlage "{name}" existiert bereits. Überschreiben?',
    collisionConfirmYes: 'Ja, überschreiben',
    collisionConfirmCancel: 'Abbrechen',
    loadAction: 'Laden',
    loadConfirm: 'Vorlage "{name}" laden?',
    loadConfirmYes: 'Ja, laden',
    loadFeedback: 'Vorlage "{name}" geladen. Klassen, Schießplätze und Runden/Passen werden aktualisiert.',
    deleteAction: 'Löschen',
    deleteConfirm: 'Vorlage "{name}" löschen?',
    deleteConfirmYes: 'Ja, löschen',
    emptyHeading: 'Neue Vorlage speichern',
    emptyBody: 'Speichern Sie die aktuelle Einrichtung als Vorlage, um schnell neue Turniere zu starten.',
    exportButton: 'Alle Vorlagen exportieren',
    exportFeedback: 'Vorlagen exportiert: presets-{date}.json',
    importButton: 'Vorlagen importieren',
    importFileLabel: 'Importierte Datei wählen',
    importConfirm:
      'Import wird alle {currentCount} aktuellen Vorlagen durch {importCount} importierte Vorlagen ersetzen. Fortfahren?',
    importConfirmYes: 'Ja, ersetzen',
    importSuccess: 'Vorlagen erfolgreich importiert. {count} Vorlagen sind jetzt verfügbar.',
    importError: 'Import fehlgeschlagen: {error}',
  },
  // Phase 3 Plan 01 section — score entry table, tap-button picker, Runde/Passe
  // navigation. Added verbatim per 03-01-PLAN.md Task 2 action text.
  scoring: {
    heading: 'Erfassung',
    notConfiguredHeading: 'Turnier nicht konfiguriert',
    notConfiguredBody: 'Gehen Sie zu Einrichtung, um zu beginnen.',
    roundLabel: 'Runde',
    passeLabel: 'Passe',
    advanceButtonAria: 'Nächste Passe',
    columnLine: 'Linie',
    columnName: 'Name',
    columnClass: 'Klasse',
    columnSum: 'Summe',
    sumIncomplete: '–',
    pickerTitle: (name: string, preview: string) => `Punkte von ${name} (${preview})`,
    pickerCancel: 'Abbrechen',
    pickerAriaMiss: 'Fehlschuss (0 Punkte)',
    pickerAriaX: 'X-Ring (10 Punkte)',
    pickerAriaNumeric: (value: string) => `${value} Punkte`,
    // Phase 3 Plan 02 — sortable column headers (SCORE-04).
    sortAscending: 'aufsteigend sortiert',
    sortDescending: 'absteigend sortiert',
    // Phase 3 Plan 03 — completion detection and the permanent finalize/lock action
    // (SCORE-06/07, D-09/D-10). Added verbatim per 03-03-PLAN.md Task 2 action text.
    completionHelper: 'Erfassung ist noch nicht vollständig.',
    finalizeButton: 'Turnier abschließen',
    finalizeModalTitle: 'Turnier abschließen?',
    finalizeModalBody:
      'Diese Aktion sperrt alle Ergebnisse und kann nicht rückgängig gemacht werden. Fortfahren?',
    finalizeConfirmYes: 'Ja, abschließen',
    finalizeConfirmCancel: 'Abbrechen',
    finalizedMessage: 'Erfassung abgeschlossen. Die Ergebnisse sind jetzt gesperrt.',
  },
  // Phase 4 section — the single append point for ALL Phase 4 strings, including the
  // reset/guard strings consumed by Plans 02/03 of this phase. Added verbatim per
  // 04-UI-SPEC.md's "Strings Module Extension" block.
  results: {
    heading: 'Ergebnisse',
    columnRank: 'Rang',
    columnName: 'Name',
    columnLine: 'Schießplatz',
    columnTotal: 'Gesamt',
    classDropdownLabel: 'Klasse',
    inProgressLegend: '* Ergebnis noch nicht vollständig — Erfassung läuft.',
    inProgressAria: 'Ergebnis noch nicht vollständig',
    emptyHeading: 'Noch keine Ergebnisse',
    emptyBody: 'Registrieren Sie Schützen und erfassen Sie Punkte, um Ergebnisse zu sehen.',
    resetButton: 'Neues Turnier starten',
    resetConfirmTitle: 'Neues Turnier starten?',
    resetConfirmBody:
      'Alle Schützen und Punkte werden gelöscht. Klassen, Schießplätze und Runden/Passen bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden. Fortfahren?',
    resetConfirmYes: 'Ja, zurücksetzen',
    resetConfirmCancel: 'Abbrechen',
    resetSuccess: 'Turnier zurückgesetzt. Klassen, Schießplätze und Runden/Passen sind erhalten.',
    resetError: 'Zurücksetzen fehlgeschlagen: {error}',
    guardMessage: 'Turnier abgeschlossen — Zurücksetzen, um zu ändern.',
  },
} as const;
