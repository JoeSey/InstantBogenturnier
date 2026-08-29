import type { RoundRuleset, ScoreValue, ThreeDTemplateId } from '../db/schema';
import { getThreeDTemplate, type ThreeDTemplate, type ThreeDZone } from '../fixtures/threeDTemplates';

// v2 (3D milestone) — pure ruleset resolution + target scoring. Framework-free, no
// side effects, mirrors scoreCompletion.ts / ranking.ts style. Slice 1 ships the core
// only; nothing here is wired into the app yet.
//
// A stored RoundRuleset is { templateId, points-overrides }. `resolveRuleset` merges
// those overrides over the template's defaults and returns a fully-populated,
// ready-to-use object. `scoreTarget` turns the outcome token(s) recorded for one
// target into a point value.

export interface ResolvedRuleset {
  templateId: ThreeDTemplateId;
  label: string;
  entriesPerTarget: 1 | 2;
  maxArrows: 1 | 2 | 3;
  zones: ThreeDTemplate['zones'];
  tokens: ScoreValue[];
  // Fully populated: one entry for every token the template permits, plus M:0.
  points: Record<string, number>;
  targetMax: number;
  tieBreak: ThreeDZone[];
}

// The zone letter of a 3D hit token ('K1' -> 'K'), or null for a miss or for any
// non-3D value (ring scores fall through to null).
export function tokenZone(token: ScoreValue): ThreeDZone | null {
  if (token === 'M') return null;
  const head = token.charAt(0);
  return head === 'K' || head === 'V' || head === 'W' ? head : null;
}

// The arrow ordinal of a 3D hit token ('K2' -> 2), or null for a miss or a non-3D
// value ('10' -> null, '1' -> null).
export function tokenOrdinal(token: ScoreValue): number | null {
  if (tokenZone(token) === null) return null;
  const n = Number(token.charAt(1));
  return Number.isInteger(n) && n >= 1 ? n : null;
}

// A fresh RoundRuleset seeded from a template's defaults — the shape the Setup 3D
// panel writes when a template is first chosen for a round.
export function defaultRoundRuleset(templateId: ThreeDTemplateId): RoundRuleset {
  return { templateId, points: { ...getThreeDTemplate(templateId).defaultPoints } };
}

export function resolveRuleset(rr: RoundRuleset): ResolvedRuleset {
  const t = getThreeDTemplate(rr.templateId);
  const points: Record<string, number> = {};
  for (const token of t.tokens) {
    points[token] = rr.points[token] ?? t.defaultPoints[token] ?? 0;
  }
  // A miss never scores, regardless of template defaults or a stray override.
  points.M = 0;

  return {
    templateId: t.id,
    label: t.label,
    entriesPerTarget: t.entriesPerTarget,
    maxArrows: t.maxArrows,
    zones: t.zones,
    tokens: [...t.tokens],
    points,
    targetMax: t.targetMax,
    tieBreak: [...t.tieBreak],
  };
}

// Points + completion for a single target from the outcome token(s) recorded for it.
// `tokens` holds the entries stored so far (0..entriesPerTarget). A target is complete
// once it has `entriesPerTarget` non-null entries — for first-hit rounds that is a
// single token (a zone hit, or 'M' meaning all permitted arrows missed).
export function scoreTarget(
  rs: ResolvedRuleset,
  tokens: (ScoreValue | null | undefined)[]
): { points: number; complete: boolean } {
  const present = tokens.filter((t): t is ScoreValue => t != null);

  if (rs.entriesPerTarget === 1) {
    const token = present[0];
    return {
      points: token === undefined ? 0 : (rs.points[token] ?? 0),
      complete: present.length >= 1,
    };
  }

  // entriesPerTarget === 2 (additive rounds, e.g. Doppelhunter) — no such template
  // ships yet; this branch keeps the kernel total-correct for when one does.
  return {
    points: present.reduce((sum, token) => sum + (rs.points[token] ?? 0), 0),
    complete: present.length >= rs.entriesPerTarget,
  };
}
