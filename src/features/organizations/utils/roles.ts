export const ROLES = ["owner", "admin", "editor", "livechat", "readonly"] as const;
export type OrgRole = (typeof ROLES)[number];

export const ASSIGNABLE_ROLES = ["admin", "editor", "livechat", "readonly"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  livechat: 1,
  readonly: 0,
};

export const ROLE_META: Record<OrgRole, { label: string; description: string }> = {
  owner: {
    label: "Propietario",
    description: "Control total sobre la organización, incluyendo facturación y eliminación.",
  },
  admin: {
    label: "Administrador",
    description: "Gestionar miembros, configuración, flujos de trabajo y todo el contenido.",
  },
  editor: {
    label: "Editor",
    description: "Crear y editar flujos de trabajo y contenido. No puede gestionar miembros ni configuración.",
  },
  livechat: {
    label: "Asesor",
    description: "Gestionar conversaciones de chat en vivo únicamente.",
  },
  readonly: {
    label: "Solo lectura",
    description: "Ver todo pero sin poder realizar cambios.",
  },
};

export function getRoleLabel(role: string): string {
  return ROLE_META[role as OrgRole]?.label ?? role;
}

export function hasMinRole(memberRole: string, minRole: OrgRole): boolean {
  return (ROLE_HIERARCHY[memberRole as OrgRole] ?? -1) >= ROLE_HIERARCHY[minRole];
}

export function canManageMembers(role: string): boolean {
  return hasMinRole(role, "admin");
}
