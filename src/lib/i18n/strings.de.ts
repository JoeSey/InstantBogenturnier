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
} as const;
