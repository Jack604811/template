export function getAvatarStyle(name: string): React.CSSProperties {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  const index = (hash % 8) + 1;
  return { backgroundColor: `var(--avatar-${index})` };
}
