import type { ScoreValue, ThreeDScoreValue, ThreeDTemplateId } from '../db/schema';

// v2 (3D milestone) — ruleset TEMPLATES. A template is fixed reference data: which
// zones a 3D animal target has, how many arrows are permitted, the tie-break order,
// and a set of DEFAULT point values. Trainers pick a template per round and may then
// override individual point cells (stored in RoundRuleset.points); they never edit
// the structure. See .planning/milestones/v2-3D-DESIGN.md and, for the rules the
// defaults come from, the auto-memory `3d-archery-scoring-research.md`.
//
// Near-term ships only the two DFBV first-hit-counts, single-entry templates. Code
// that consumes a template MUST iterate `zones` / `tokens` rather than hard-coding
// three zones, so 2-zone (Scandinavian) and 4-zone (WA) templates — and the 2-entry
// additive Doppelhunter — remain a data addition later, not a reshape.

export type ThreeDZone = 'K' | 'V' | 'W';

export interface ThreeDTemplate {
  id: ThreeDTemplateId;
  label: string;
  // How many score entries are stored per target. 1 for first-hit-counts rounds
  // (the outcome token carries the arrow ordinal); 2 for additive rounds (deferred).
  entriesPerTarget: 1 | 2;
  // Max arrows permitted at the target — bounds the ordinal in the hit tokens.
  maxArrows: 1 | 2 | 3;
  // Ordered high value → low value. Drives the outcome-grid rows and the tie-break.
  zones: { zone: ThreeDZone; label: string }[];
  // Every outcome the template permits = zone × ordinal (1..maxArrows), plus 'M'.
  // Order is also the natural picker order (by ordinal, then zone).
  tokens: ThreeDScoreValue[];
  // Point value per permitted token. 'M' is always 0. resolveRuleset() fills any gap
  // with 0, but a well-formed template lists every token here.
  defaultPoints: Partial<Record<ScoreValue, number>>;
  // Highest points obtainable at one target — reference/validation only.
  targetMax: number;
  // Tie-break priority after total score: count of tokens in each zone, best first.
  tieBreak: ThreeDZone[];
}

const KVW_ZONES: ThreeDTemplate['zones'] = [
  { zone: 'K', label: 'Kill' },
  { zone: 'V', label: 'Vital' },
  { zone: 'W', label: 'Wound' },
];

// Build the token list for a first-hit template: for each ordinal 1..maxArrows, each
// zone in high→low order, then 'M' last.
function firstHitTokens(maxArrows: 1 | 2 | 3): ThreeDScoreValue[] {
  const tokens: ThreeDScoreValue[] = [];
  for (let ordinal = 1; ordinal <= maxArrows; ordinal++) {
    for (const { zone } of KVW_ZONES) {
      tokens.push(`${zone}${ordinal}` as ThreeDScoreValue);
    }
  }
  tokens.push('M');
  return tokens;
}

// DFBV Sportordnung Jan 2024 §6.7.8 — Drei-Pfeil-Runde. Max 3 arrows, only the first
// arrow that hits a scoring zone counts; the token records which zone and which arrow.
const DFBV_3ARROW: ThreeDTemplate = {
  id: 'dfbv-3arrow',
  label: '3-Pfeil-Runde',
  entriesPerTarget: 1,
  maxArrows: 3,
  zones: KVW_ZONES,
  tokens: firstHitTokens(3),
  defaultPoints: {
    K1: 20, V1: 18, W1: 16,
    K2: 14, V2: 12, W2: 10,
    K3: 8, V3: 6, W3: 4,
    M: 0,
  },
  targetMax: 20,
  tieBreak: ['K', 'V', 'W'],
};

// DFBV §6.7.9 — Hunter-Runde / Ein-Pfeil-Runde. One arrow; equivalent to the
// first-arrow row of the 3-arrow table.
const DFBV_HUNTER: ThreeDTemplate = {
  id: 'dfbv-hunter',
  label: 'Hunter-Runde',
  entriesPerTarget: 1,
  maxArrows: 1,
  zones: KVW_ZONES,
  tokens: firstHitTokens(1),
  defaultPoints: { K1: 20, V1: 18, W1: 16, M: 0 },
  targetMax: 20,
  tieBreak: ['K', 'V', 'W'],
};

export const THREE_D_TEMPLATES: readonly ThreeDTemplate[] = [DFBV_3ARROW, DFBV_HUNTER];

const BY_ID: Record<ThreeDTemplateId, ThreeDTemplate> = {
  'dfbv-3arrow': DFBV_3ARROW,
  'dfbv-hunter': DFBV_HUNTER,
};

export function getThreeDTemplate(id: ThreeDTemplateId): ThreeDTemplate {
  return BY_ID[id];
}
