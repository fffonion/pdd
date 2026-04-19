export const WORKSPACE_STAGE_BUSY_DELAY_MS = 100;
export const SOURCE_PROCESSING_DEBOUNCE_MS = 180;

export function getWorkspaceUiBusy(
  sourceProcessingBusy: boolean,
  editorRefreshBusy: boolean,
) {
  return sourceProcessingBusy || editorRefreshBusy;
}

export function getWorkspaceStageBusy(
  sourceProcessingBusy: boolean,
  _editorRefreshBusy: boolean,
) {
  return sourceProcessingBusy;
}

export function shouldShowWorkspacePanelsSuspenseLoading(
  hasSelectedFile: boolean,
  workspaceBusy: boolean,
) {
  return hasSelectedFile && workspaceBusy;
}

export function scheduleWorkspaceStageBusyProcessing(
  onBusyStart: () => void,
  onProcessStart: () => void,
  options?: {
    busyDelayMs?: number;
    processDelayMs?: number;
  },
) {
  const busyDelayMs = Math.max(0, options?.busyDelayMs ?? WORKSPACE_STAGE_BUSY_DELAY_MS);
  const processDelayMs = Math.max(busyDelayMs, options?.processDelayMs ?? SOURCE_PROCESSING_DEBOUNCE_MS);
  const busyTimeoutId = setTimeout(() => onBusyStart(), busyDelayMs);
  const processTimeoutId = setTimeout(() => onProcessStart(), processDelayMs);

  return () => {
    clearTimeout(busyTimeoutId);
    clearTimeout(processTimeoutId);
  };
}
