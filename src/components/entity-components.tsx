import {
  AlertTriangleIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PackageOpenIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardTitle } from "./ui/card";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type EntityHeaderProps = {
  title: string;
  description?: string;
  newButtonLabel?: string;
  disabled?: boolean;
  isCreating?: boolean;
} & (
  | { onNew: () => void; newButtonHref?: never }
  | { newButtonHref: string; onNew?: never }
  | { onNew?: never; newButtonHref?: never }
);

export const EntityHeader = ({
  title,
  description,
  onNew,
  newButtonHref,
  newButtonLabel,
  disabled,
  isCreating,
}: EntityHeaderProps) => {
  return (
    <div className="flex flex-row items-center justify-between gap-x-4">
      <div className="flex flex-col">
        <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {onNew && !newButtonHref && (
        <Button disabled={isCreating || disabled} size="sm" onClick={onNew}>
          <PlusIcon className="size-4" />
          {newButtonLabel}
        </Button>
      )}
      {newButtonHref && !onNew && (
        <Button size="sm" asChild>
          <Link href={newButtonHref} prefetch>
            <PlusIcon className="size-4" />
            {newButtonLabel}
          </Link>
        </Button>
      )}
    </div>
  );
};

type EntityContainerProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  search?: React.ReactNode;
  pagination?: React.ReactNode;
};

export const EntityContainer = ({
  children,
  header,
  search,
  pagination,
}: EntityContainerProps) => {
  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-screen-xl w-full flex flex-col gap-y-8 h-full">
        {header}
        <div className="flex flex-col gap-y-4 h-full">
          {search}
          {children}
        </div>
        {pagination}
      </div>
    </div>
  );
};

interface EntitySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const EntitySearch = ({
  value,
  onChange,
  placeholder = "Search",
}: EntitySearchProps) => {
  return (
    <div className="relative ml-auto">
      <SearchIcon className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="max-w-[400px] bg-none shadow-none border-none focus-visible:ring-0 pl-8"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

interface EntityPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const EntityPagination = ({
  page,
  totalPages,
  onPageChange,
  disabled,
}: EntityPaginationProps) => {
  return (
    <div className="flex items-center justify-between gap-x-2 w-full">
      <div className="flex-1 text-sm text-muted-foreground">
        Page {page} of {totalPages || 1}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          disabled={page === 1 || disabled}
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          disabled={page === totalPages || totalPages === 0 || disabled}
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

interface StateViewProps {
  message?: React.ReactNode;
}

export const LoadingView = ({ message }: StateViewProps) => {
  return (
    <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-4">
      <Loader2Icon className="size-6 animate-spin text-primary" />
      {!!message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
};

interface ErrorViewProps {
  title?: string;
  message?: React.ReactNode;
}

export const ErrorView = ({ title, message }: ErrorViewProps) => {
  return (
    <Empty className="bg-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertTriangleIcon className="text-destructive" />
        </EmptyMedia>
      </EmptyHeader>
      {title && <EmptyTitle>{title}</EmptyTitle>}
      {!!message && <EmptyDescription>{message}</EmptyDescription>}
    </Empty>
  );
};

interface EmptyViewProps extends StateViewProps {
  onNew?: () => void;
}

export const EmptyView = ({ message, onNew }: EmptyViewProps) => {
  return (
    <Empty className="bg-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageOpenIcon />
        </EmptyMedia>
      </EmptyHeader>
      <EmptyTitle>No items</EmptyTitle>
      {!!message && <EmptyDescription>{message}</EmptyDescription>}
      {!!onNew && (
        <EmptyContent>
          <Button onClick={onNew}>Add item</Button>
        </EmptyContent>
      )}
    </Empty>
  );
};

interface EntityListProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey?: (item: T, index: number) => string | number;
  emptyView?: React.ReactNode;
  className?: string;
}

export function EntityList<T>({
  items,
  renderItem,
  getKey,
  emptyView,
  className,
}: EntityListProps<T>) {
  if (items.length === 0 && emptyView) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="max-w-sm mx-auto">{emptyView}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-y-4", className)}>
      {items.map((item, index) => (
        <div key={getKey ? getKey(item, index) : index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

export interface EntityMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
}

export interface EntityMenuGroup {
  items: EntityMenuItem[];
  separator?: boolean;
}

interface EntityItemProps {
  href?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: React.ReactNode;
  actions?: React.ReactNode;
  onRemove?:
    | ((e: React.MouseEvent) => void | Promise<void>)
    | (() => void | Promise<void>);
  isRemoving?: boolean;
  menuItems?: EntityMenuItem[];
  menuGroups?: EntityMenuGroup[];
  className?: string;
}

export const EntityItem = ({
  href,
  title,
  subtitle,
  image,
  actions,
  onRemove,
  isRemoving,
  menuItems,
  menuGroups,
  className,
}: EntityItemProps) => {
  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRemoving) {
      return;
    }

    if (onRemove) {
      await onRemove(e);
    }
  };

  const renderMenuItems = () => {
    if (!menuItems) return null;

    return menuItems.map((item) => {
      const Icon = item.icon;
      return (
        <DropdownMenuItem
          key={item.label}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            item.onClick();
          }}
          disabled={item.disabled}
          variant={item.variant}
        >
          <Icon className="size-4" />
          {item.label}
        </DropdownMenuItem>
      );
    });
  };

  const renderMenuGroups = () => {
    if (!menuGroups) return null;

    return menuGroups.map((group, groupIndex) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: Group index is the only stable identifier here since groups don't have IDs
      <div key={`group-${groupIndex}`}>
        {group.separator && <DropdownMenuSeparator />}
        <DropdownMenuGroup>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  item.onClick();
                }}
                disabled={item.disabled}
                variant={item.variant}
              >
                <Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </div>
    ));
  };

  const hasMenu = menuItems || menuGroups || onRemove;

  const content = (
    <Card
      className={cn(
        "p-4 shadow-none hover:shadow cursor-pointer",
        isRemoving && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <CardContent className="flex flex-row items-center justify-between p-0">
        <div className="flex items-center gap-3">
          {image}
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {!!subtitle && (
              <CardDescription className="text-xs">{subtitle}</CardDescription>
            )}
          </div>
        </div>
        {(actions || hasMenu) && (
          <div className="flex gap-x-4 items-center">
            {actions}
            {hasMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVerticalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                  className="[--radius:1rem]"
                >
                  {menuItems && (
                    <DropdownMenuGroup>
                      {renderMenuItems()}
                    </DropdownMenuGroup>
                  )}
                  {menuGroups && renderMenuGroups()}
                  {!menuItems && !menuGroups && onRemove && (
                    <DropdownMenuItem onClick={handleRemove}>
                      <TrashIcon className="size-4 shrink-0" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} prefetch>
        {content}
      </Link>
    );
  }

  return content;
};

interface EntityGridProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey?: (item: T, index: number) => string | number;
  emptyView?: React.ReactNode;
  className?: string;
}

export function EntityGrid<T>({
  items,
  renderItem,
  getKey,
  emptyView,
  className,
}: EntityGridProps<T>) {
  if (items.length === 0 && emptyView) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="max-w-sm mx-auto">{emptyView}</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6",
      className
    )}>
      {items.map((item, index) => (
        <div key={getKey ? getKey(item, index) : index} className="flex justify-center">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

interface EntityGridItemProps {
  href?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  image?: string;
  onClick?: () => void;
  className?: string;
}

export const EntityGridItem = ({
  href,
  title,
  description,
  icon,
  image,
  onClick,
  className,
}: EntityGridItemProps) => {
  const isButton = Boolean(onClick && !href);
  const Component = isButton ? "button" : "div";

  const content = (
    <Component
      type={isButton ? "button" : undefined}
      className={cn(
        "text-left",
        "group relative overflow-hidden",
        "p-8 rounded-3xl",
        "bg-white dark:bg-card",
        "border border-border/40 shadow-sm",
        "hover:shadow-xl hover:border-primary/20",
        "transition-all duration-300 ease-in-out",
        "cursor-pointer",
        "flex flex-col h-full min-h-[264px]",
        "w-full",
        className,
      )}
      onClick={isButton ? onClick : undefined}
    >
      <div className="flex flex-col gap-6 flex-1 z-10">
        {/* Icon/Image at the top left */}
        {(icon || image) && (
          <div className="size-16 shrink-0 rounded-full bg-primary/5 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/10">
            {icon}
            {image && (
              <Image
                src={image}
                alt={title}
                width={32}
                height={32}
                className="size-16 object-contain p-3"
              />
            )}
          </div>
        )}
        
        {/* Title and description below */}
        <div className="flex flex-col gap-3 flex-1">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors duration-300">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-base text-muted-foreground/80 line-clamp-3 leading-relaxed font-normal">
              {description}
            </CardDescription>
          )}
        </div>
      </div>
    </Component>
  );

  if (href) {
    return (
      <Link href={href} prefetch>
        {content}
      </Link>
    );
  }

  return content;
};
