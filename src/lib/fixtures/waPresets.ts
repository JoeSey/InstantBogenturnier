// WA-style rounds/passes reference presets (CONTEXT.md D-03). "Passe" = one end
// (Durchgang) per D-01; totalArrows is derived reference data (arrowsPerPasse *
// passesPerRound * numberOfRounds), not stored independently in db.rounds.
export const WA_PRESETS = [
  {
    id: 'wa-18m',
    name: 'WA 18m',
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    distance: '18m',
    totalArrows: 30,
  },
  {
    id: 'wa-25m',
    name: 'WA 25m',
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    distance: '25m',
    totalArrows: 30,
  },
  {
    id: 'wa-70m',
    name: 'WA 70m',
    arrowsPerPasse: 6,
    passesPerRound: 6,
    numberOfRounds: 1,
    distance: '70m',
    totalArrows: 36,
  },
] as const;
