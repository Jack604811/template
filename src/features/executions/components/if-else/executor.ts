import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { ifElseChannel } from "@/inngest/channels/if-else";

type Operator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains";

export type IfElseCondition = {
  id: string;
  label?: string;
  variable: string;
  operator: Operator;
  value: string;
};

export type IfElseNodeData = {
  variableName?: string;
  conditions?: IfElseCondition[];
};

type IfElseResult = {
  branch: string;
  label?: string;
  value: unknown;
};

function evaluateCondition(
  operator: Operator,
  left: string,
  right: string,
): boolean {
  switch (operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "greater_than":
      return Number(left) > Number(right);
    case "less_than":
      return Number(left) < Number(right);
    case "contains":
      return left.includes(right);
    default:
      return false;
  }
}

export const ifElseExecutor: NodeExecutor<IfElseNodeData> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(
    ifElseChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const variableName = data.variableName || "condition";
    const conditions = data.conditions ?? [];

    let result: IfElseResult = {
      branch: "else",
      label: "Else",
      value: null,
    };

    for (let index = 0; index < conditions.length; index++) {
      const condition = conditions[index];
      if (!condition.variable || !condition.operator) continue;

      const compiled = Handlebars.compile(condition.variable)(context);
      const value = compiled ?? "";
      const compareTo = condition.value ?? "";

      if (evaluateCondition(condition.operator, String(value), String(compareTo))) {
        result = {
          branch: `case-${index}`,
          label: condition.label || `Condition ${index + 1}`,
          value,
        };
        break;
      }
    }

    const existingBranches =
      (context.__conditionBranches as Record<string, string> | undefined) ?? {};

    const nextContext = {
      ...context,
      [variableName]: result,
      __conditionBranches: {
        ...existingBranches,
        [nodeId]: result.branch,
      },
    };

    await publish(
      ifElseChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return nextContext;
  } catch (error) {
    await publish(
      ifElseChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};

