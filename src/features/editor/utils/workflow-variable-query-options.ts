export const WORKFLOW_VARIABLES_LIVE_REFETCH_INTERVAL_MS = 2000;

export interface WorkflowVariablesQuerySettings {
  refetchInterval: number | false;
  refetchIntervalInBackground: boolean;
}

export const getWorkflowVariablesQuerySettings = (
  liveUpdatesEnabled: boolean,
): WorkflowVariablesQuerySettings => {
  return {
    refetchInterval: liveUpdatesEnabled
      ? WORKFLOW_VARIABLES_LIVE_REFETCH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: false,
  };
};
