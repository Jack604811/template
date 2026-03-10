export const VARIABLE_INPUT_ROOT_SELECTOR = "[data-variable-input-root]";

type ClosestCapableTarget = EventTarget | null;

const hasClosest = (
  target: ClosestCapableTarget,
): target is EventTarget & {
  closest: (selector: string) => unknown;
} => {
  return (
    target !== null &&
    typeof target === "object" &&
    "closest" in target &&
    typeof target.closest === "function"
  );
};

export const isPointerTargetInsideVariableInputRoot = (
  target: ClosestCapableTarget,
) => {
  if (!hasClosest(target)) {
    return false;
  }

  return Boolean(target.closest(VARIABLE_INPUT_ROOT_SELECTOR));
};
