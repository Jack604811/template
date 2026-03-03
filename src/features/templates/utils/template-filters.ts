import type { Template } from "../types";

/**
 * Filter templates by search query
 * Matches against template name or category name
 */
export function filterTemplatesBySearch(
  templates: Template[],
  searchQuery: string,
): Template[] {
  if (!searchQuery) {
    return templates;
  }

  const query = searchQuery.toLowerCase();
  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(query) ||
      template.category?.name.toLowerCase().includes(query),
  );
}

/**
 * Filter system templates by category
 * Returns templates grouped by category name
 */
export function filterSystemTemplatesByCategory(
  templates: Template[],
  categoryName?: string,
): Record<string, Template[]> {
  const grouped: Record<string, Template[]> = {};

  templates.forEach((template) => {
    const category = template.category?.name || "Other";
    if (!categoryName || category === categoryName) {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    }
  });

  return grouped;
}

/**
 * Filter templates by category ID
 */
export function filterTemplatesByCategoryId(
  templates: Template[],
  categoryId?: string,
): Template[] {
  if (!categoryId) {
    return templates;
  }

  return templates.filter((template) => template.category?.id === categoryId);
}
