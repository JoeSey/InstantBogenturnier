// Tracks whether a new service-worker update is waiting (set by main.ts's onNeedRefresh).
// Dismissal state is intentionally NOT persisted here (D-03): session-only, reappears on
// next full app open if still pending. The consuming UpdateBanner component is built in
// Plan 02 — this store exists now so main.ts can wire onNeedRefresh to a real target.
let updateAvailableState = $state(false);

export const updateAvailable = {
  set(value: boolean) {
    updateAvailableState = value;
  },
  get current() {
    return updateAvailableState;
  },
};
