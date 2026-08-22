import { Check } from "lucide-react";

/** "Nodebase podrá: [bullets]" block shown on OAuth-style connection cards. */
export function ConnectionPermissionList({
  permissions,
}: {
  permissions: readonly string[];
}) {
  if (permissions.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">Nodebase podrá:</p>
      <ul className="space-y-2">
        {permissions.map((permission) => (
          <li
            key={permission}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}
