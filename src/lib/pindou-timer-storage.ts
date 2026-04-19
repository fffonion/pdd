export interface PindouTimerState {
  elapsedMs: number;
  running: boolean;
  startedAt: number | null;
}

export interface StoredPindouTimerState {
  elapsedMs: number;
  running: boolean;
  startedAt: number | null;
}

const EMPTY_PINDOU_TIMER_STATE: PindouTimerState = {
  elapsedMs: 0,
  running: false,
  startedAt: null,
};

export function parseStoredPindouTimerState(
  rawValue: string | null,
  now = Date.now(),
): PindouTimerState {
  if (!rawValue) {
    return EMPTY_PINDOU_TIMER_STATE;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredPindouTimerState>;
    const elapsedMs = Number.isFinite(parsed.elapsedMs) && (parsed.elapsedMs ?? 0) >= 0
      ? Math.round(parsed.elapsedMs as number)
      : 0;
    const running = parsed.running === true;
    const startedAt = Number.isFinite(parsed.startedAt) ? Math.round(parsed.startedAt as number) : null;

    if (!running) {
      return {
        elapsedMs,
        running: false,
        startedAt: null,
      };
    }

    if (startedAt === null) {
      return EMPTY_PINDOU_TIMER_STATE;
    }

    return {
      elapsedMs: elapsedMs + Math.max(0, now - startedAt),
      running: true,
      startedAt: now,
    };
  } catch {
    return EMPTY_PINDOU_TIMER_STATE;
  }
}

export function serializePindouTimerState(state: PindouTimerState) {
  const payload: StoredPindouTimerState = {
    elapsedMs: Math.max(0, Math.round(state.elapsedMs)),
    running: state.running,
    startedAt: state.running && Number.isFinite(state.startedAt) ? Math.round(state.startedAt as number) : null,
  };

  return JSON.stringify(payload);
}
