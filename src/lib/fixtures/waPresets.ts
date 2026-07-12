// WA-style rounds/passes reference presets (CONTEXT.md D-03). "Passe" = one end
// (Durchgang) per D-01; totalArrows is derived reference data (arrowsPerPasse *
// passesPerRound * numberOfRounds), not stored independently in db.rounds.
export const WA_PRESETS = [
  {
    id: 'wa-10x3',
    name: 'WA 10 Passen à 3 Pfeile',
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    rings: 10,
    totalArrows: 30,
  },
  {
    id: 'dfbv-6x5',
    name: 'DFBV 6 Runden à 5 Pfeile',
    arrowsPerPasse: 5,
    passesPerRound: 1,
    numberOfRounds: 6,
    rings: 5,
    totalArrows: 30,
  },
  {
    id: 'wa-70',
    name: 'WA 70',
    arrowsPerPasse: 6,
    passesPerRound: 6,
    numberOfRounds: 1,
    rings: 10,
    totalArrows: 36,
  },
] as const;
