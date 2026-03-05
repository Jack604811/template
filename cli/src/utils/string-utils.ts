export function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export function kebabToCamel(str: string): string {
  const pascal = kebabToPascal(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function kebabToSnakeUpper(str: string): string {
  return str.toUpperCase().replace(/-/g, "_");
}

export function pascalToKebab(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

