// AB / AB-CD mode detection (D-08, D-09). Pure, framework-free — computed live from the
// registered shooter count vs. the configured shooting-line count.

export type TournamentMode = 'AB' | 'AB/CD';

// AB mode: up to 2 shooters share a line (positions A/B).
// AB/CD mode: 4 shooters per line, split into two sequential flights (A/B, then C/D).
// Threshold (D-09): shooterCount > 2 x lineCount -> AB/CD; otherwise AB.
export function detectMode(shooterCount: number, lineCount: number): TournamentMode {
  return shooterCount > 2 * lineCount ? 'AB/CD' : 'AB';
}
