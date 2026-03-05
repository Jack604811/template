# Nodebase Architecture

This document describes the folder structure, patterns, and architectural decisions in the Nodebase project.

## Technology Stack

- **Framework**: Next.js 15 (App Router with React 19)
- **Database**: PostgreSQL with Prisma ORM
- **API Layer**: tRPC v11 with React Query
- **Workflow Engine**: Inngest with Realtime
- **Authentication**: Better Auth with GitHub/Google OAuth
- **Subscriptions**: Polar
- **UI**: shadcn/ui + Tailwind CSS v4
- **Forms**: React Hook Form + Zod
- **State**: Jotai (minimal global state)
- **Workflow Editor**: React Flow
- **Linting**: Biome
- **Monitoring**: Sentry

## Folder Structure

### Overview

```
nodebase/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Main app with sidebar
│   │   │   ├── (editor)/      # Full-screen workflow editor
│   │   │   └── (rest)/        # Other dashboard pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Better Auth endpoint
│   │   │   ├── inngest/       # Inngest endpoint
│   │   │   ├── trpc/          # tRPC endpoint
│   │   │   └── webhooks/      # Webhook handlers
│   │   └── globals.css        # Tailwind v4 config
│   ├── components/            # Shared components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── react-flow/        # React Flow components
│   │   ├── entity-components.tsx  # CRUD components
│   │   ├── node-selector.tsx  # Node selection UI
│   │   └── workflow-node.tsx  # Node wrapper
│   ├── config/                # Configuration
│   │   ├── constants.ts       # Global constants
│   │   └── node-components.ts # Node registry
│   ├── features/              # Feature modules
│   │   ├── auth/
│   │   ├── credentials/
│   │   ├── editor/
│   │   ├── executions/
│   │   ├── subscriptions/
│   │   ├── triggers/
│   │   └── workflows/
│   ├── hooks/                 # Shared hooks
│   ├── inngest/               # Inngest setup
│   │   ├── channels/          # Realtime channels
│   │   ├── client.ts          # Inngest client
│   │   ├── functions.ts       # Workflow executor
│   │   └── utils.ts           # Utilities
│   ├── lib/                   # Shared utilities
│   │   ├── auth.ts            # Better Auth setup
│   │   ├── auth-client.ts     # Client auth
│   │   ├── auth-utils.ts      # Auth guards
│   │   ├── db.ts              # Prisma client
│   │   ├── encryption.ts      # Cryptr wrapper
│   │   ├── polar.ts           # Polar client
│   │   └── utils.ts           # Generic utils
│   └── trpc/                  # tRPC setup
│       ├── routers/           # tRPC routers
│       ├── client.tsx         # Client setup
│       ├── init.ts            # Procedures
│       └── server.tsx         # Server setup
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── cli/                       # CLI tool
│   ├── src/                   # CLI source
│   ├── templates/             # Code templates
│   └── package.json           # CLI dependencies
└── public/
    └── logos/                 # Service logos
```

## Feature-Based Architecture

Each feature follows this structure:

```
src/features/{feature-name}/
├── components/                # React components
│   └── {feature-name}.tsx
├── hooks/                     # React hooks
│   ├── use-{feature-name}s.ts     # Main hooks
│   └── use-{feature-name}-params.ts # URL params
├── server/                    # Server-side code
│   ├── prefetch.ts           # Server data fetching
│   ├── routers.ts            # tRPC router
│   └── params-loader.ts      # Server params
├── params.ts                  # Client URL params
└── types.ts                   # TypeScript types (optional)
```

### Why Feature-Based?

1. **Colocation**: Related code stays together
2. **Scalability**: Easy to add/remove features
3. **Clear Boundaries**: Each feature is self-contained
4. **Team Collaboration**: Different teams can work on different features

## Node Architecture

### Node Structure

Each workflow node has 5 files:

```
src/features/{executions|triggers}/components/{node-name}/
├── node.tsx           # React component (UI)
├── dialog.tsx         # Configuration dialog
├── actions.ts         # Server actions (realtime tokens)
├── executor.ts        # Inngest executor (business logic)
└── channel.ts         # Realtime channel (in inngest/channels/)
```

### Node Registration (5 Locations)

When adding a new node, update these files:

1. **Prisma Schema** (`prisma/schema.prisma`):
   ```prisma
   enum NodeType {
     MY_NEW_NODE
   }
   ```

2. **Node Components** (`src/config/node-components.ts`):
   ```typescript
   export const nodeComponents = {
     [NodeType.MY_NEW_NODE]: MyNewNode,
   };
   ```

3. **Executor Registry** (`src/features/executions/lib/executor-registry.ts`):
   ```typescript
   export const executorRegistry = {
     [NodeType.MY_NEW_NODE]: myNewNodeExecutor,
   };
   ```

4. **Inngest Channels** (`src/inngest/functions.ts`):
   ```typescript
   channels: [myNewNodeChannel(), ...]
   ```

5. **Node Selector** (`src/components/node-selector.tsx`):
   ```typescript
   const executionNodes = [
     {
       type: NodeType.MY_NEW_NODE,
       label: "My New Node",
       description: "...",
       icon: "/logos/service.svg",
     },
   ];
   ```

### Node Types

- **Trigger Nodes**: Start workflows (e.g., Manual Trigger, Google Form, Stripe)
- **Execution Nodes**: Process data (e.g., HTTP Request, AI nodes, Communication)

### Node Lifecycle

1. **User Interaction**: User double-clicks node or clicks settings
2. **Configuration**: Dialog opens with React Hook Form + Zod
3. **Save**: Data saved to node's `data` property in React Flow
4. **Execution**: When workflow runs:
   - Inngest calls executor
   - Executor validates data
   - Executor publishes realtime status updates
   - Executor performs action
   - Executor returns updated context
   - Context flows to next node

## Workflow Execution

### Flow

```
1. User clicks "Execute Workflow"
2. Frontend calls tRPC mutation
3. Backend sends Inngest event
4. Inngest function starts
5. Nodes sorted topologically
6. Each node executor runs in sequence
7. Context passed between nodes
8. Realtime status updates via channels
9. Execution completes
10. Status saved to database
```

### Context Passing

Nodes communicate via context object:

```typescript
// Initial context
let context = { initialData: {...} };

// Node 1 adds data
context = {
  ...context,
  myApiCall: { httpResponse: {...} },
};

// Node 2 accesses Node 1's data
const userId = context.myApiCall.httpResponse.data.id;
```

### Template Variables

Nodes use Handlebars for dynamic values:

- Simple: `{{variableName.path}}`
- JSON: `{{json variableName.object}}`

## Data Flow

### Server State (tRPC + React Query)

```
Server (tRPC Router)
  ↓ (prefetch or query)
Client (React Query Cache)
  ↓ (useSuspenseQuery)
Component (render)
```

### Client State (Minimal)

- **Jotai**: Only for global state (e.g., React Flow instance)
- **React Hook Form**: Form state
- **React Flow**: Node/edge state
- **URL**: Pagination, search (via nuqs)

## Authentication & Authorization

### Better Auth Setup

- **Email/Password**: Enabled
- **OAuth**: GitHub, Google
- **Sessions**: Database-backed
- **Middleware**: None (manual guards)

### Authorization Patterns

```typescript
// Server Components
const session = await requireAuth(); // Redirects if not authed + requires org

// tRPC
protectedProcedure      // Requires auth
organizationProcedure   // Requires auth + active organization membership
adminProcedure          // Requires owner or admin role
ownerProcedure          // Requires owner role
premiumProcedure        // Requires active subscription
```

### User Context

```typescript
ctx.auth.user.id        // In tRPC procedures
ctx.organizationId      // In organizationProcedure and role-based procedures
ctx.memberRole          // Current user's role in the organization
```

## Organizations

### Overview

All resources (workflows, credentials, executions) are organization-scoped. Users must belong to an organization and select an active organization to access the dashboard.

### Data Model

```prisma
model Organization {
  id        String   @id
  name      String
  slug      String   @unique
  members   Member[]
  workflows Workflow[]
  credentials Credential[]
}

model Member {
  id             String @id
  organizationId String
  userId         String
  role           String  // owner, admin, member
  organization   Organization
  user           User
  @@unique([organizationId, userId])
}
```

### Roles & Permissions

- **Owner**: Full control (manage members, change roles, update settings, delete organization)
- **Admin**: Manage members (except owner), update settings, full resource access
- **Member**: Access and create resources, cannot manage organization

### Organization Flow

1. User logs in/signs up
2. If no active organization → redirect to `/select-organization`
3. User creates or selects an organization
4. Active organization stored in session
5. All resources scoped to active organization

### Organization Switcher

Located in sidebar header below logo:

```tsx
<SidebarHeader>
  <SidebarMenuItem>
    <Link href="/">Logo</Link>
  </SidebarMenuItem>
  <SidebarMenuItem>
    <OrganizationSwitcher />
  </SidebarMenuItem>
</SidebarHeader>
```

### tRPC Organization Context

All resource endpoints use `organizationProcedure`:

```typescript
export const workflowsRouter = createTRPCRouter({
  create: organizationProcedure.mutation(({ ctx }) => {
    return prisma.workflow.create({
      data: {
        organizationId: ctx.organizationId,
        // ...
      },
    });
  }),
  getMany: organizationProcedure.query(({ ctx, input }) => {
    return prisma.workflow.findMany({
      where: { organizationId: ctx.organizationId },
    });
  }),
});
```

### Organization Settings

Located at `/settings/organization`:

- Update organization name (owner/admin)
- View team members
- Invite members (owner/admin)
- Remove members (owner/admin, cannot remove owner)
- Change member roles (owner only)

### Prefetch Pattern

```typescript
// src/features/organizations/server/prefetch.ts
export const prefetchOrganizations = () => {
  return prefetch(trpc.organizations.getMany.queryOptions());
};

export const prefetchOrganizationMembers = (organizationId: string) => {
  return prefetch(trpc.organizations.getMembers.queryOptions({ organizationId }));
};
```

## Subscription System (Polar)

- **Integration**: Better Auth plugin
- **Checkout**: `authClient.checkout({ slug: "pro" })`
- **Portal**: `authClient.customer.portal()`
- **Check**: `useHasActiveSubscription()`

## Realtime Updates

### Inngest Realtime

Each node has a channel for status updates:

```typescript
// Define channel
export const myNodeChannel = channel("my-node-execution")
  .addTopic(topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>());

// Publish from executor
await publish(myNodeChannel().status({
  nodeId,
  status: "loading",
}));

// Subscribe in component
const nodeStatus = useNodeStatus({
  nodeId: props.id,
  channel: MY_NODE_CHANNEL_NAME,
  topic: "status",
  refreshToken: fetchMyNodeRealtimeToken,
});
```

## Entity CRUD Pattern

Reusable components for list pages:

```tsx
<EntityContainer
  header={<EntityHeader title="..." onNew={...} />}
  search={<EntitySearch value={...} onChange={...} />}
  pagination={<EntityPagination page={...} totalPages={...} />}
>
  <EntityList
    items={...}
    renderItem={(item) => (
      <EntityItem
        href={...}
        title={...}
        subtitle={...}
        onRemove={...}
      />
    )}
    emptyView={<EmptyView message="..." />}
  />
</EntityContainer>
```

### Components

- `EntityContainer`: Page wrapper
- `EntityHeader`: Title + "New" button
- `EntitySearch`: Debounced search
- `EntityPagination`: Previous/Next
- `EntityList`: Generic list renderer
- `EntityItem`: Card with actions
- `LoadingView`, `ErrorView`, `EmptyView`: States

## Styling

### Tailwind v4 (CSS-First)

- Configuration in `src/app/globals.css`
- No `tailwind.config.ts`
- CSS variables for theming
- `@theme` directive for theme config

### shadcn/ui

- Pre-styled components
- Customizable via CSS variables
- New York style variant
- Full accessibility

## Performance Optimizations

1. **Component Memoization**: All components use `memo`
2. **Code Splitting**: Route-based + dynamic imports
3. **Suspense**: Server-side data fetching
4. **React Query**: Automatic caching + deduplication
5. **Prisma**: Connection pooling
6. **Next.js**: Image optimization, font optimization

## Security

1. **Environment Variables**: Never expose secrets
2. **Encryption**: Sensitive data encrypted with Cryptr
3. **Auth Guards**: Server-side checks
4. **Input Validation**: Zod schemas everywhere
5. **CSRF**: Better Auth handles it
6. **SQL Injection**: Prisma prevents it

## Testing Strategy

- **Unit Tests**: Complex business logic
- **Integration Tests**: API endpoints
- **E2E Tests**: Critical user flows
- **Type Safety**: TypeScript + Zod

## Deployment

### Environment Variables

See `.env.example` for required variables.

### Build Process

```bash
npm run build      # Build Next.js app
npx prisma generate # Generate Prisma client
npx prisma migrate deploy # Run migrations
```

### Hosting

- **Recommended**: Vercel (zero-config)
- **Requirements**: Node.js 18+, PostgreSQL

## CLI Tool

The Nodebase CLI helps scaffold projects and components:

```bash
nodebase init                  # Initialize project
nodebase add node              # Add a node
nodebase add feature           # Add a feature
nodebase update <name>         # Update component
nodebase check-updates         # List outdated
```

See `CLI.md` for detailed usage.

## Contributing

See `CONTRIBUTING.md` for guidelines on adding new features and nodes.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Better Auth Documentation](https://www.better-auth.com)
- [shadcn/ui](https://ui.shadcn.com)

