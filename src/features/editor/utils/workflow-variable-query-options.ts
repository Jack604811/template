export interface WorkflowVariablesQuerySettings {
  refetchInterval: false;
  refetchIntervalInBackground: boolean;
}

export const getWorkflowVariablesQuerySettings =
  (): WorkflowVariablesQuerySettings => ({
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });
