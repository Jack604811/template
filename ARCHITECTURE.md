# Nodebase — CLAUDE.md

## Architecture reference
See ARCHITECTURE.md for full system details.

## Tech stack
- Next.js 15 App Router + React 19
- PostgreSQL + Prisma ORM
- tRPC v11 + React Query
- Inngest (automation workflows) + Upstash (chat workflows — in progress)
- Better Auth (GitHub/Google OAuth)
- Polar (subscriptions)
- shadcn/ui + Tailwind CSS v4
- React Hook Form + Zod
- Jotai (minimal global state)
- React Flow (workflow editor)
- Biome (linting)
- Sentry (monitoring)
- Bun (package manager + runtime)

## Folder structure rules
- Features go in `src/features/{feature-name}/` with components/, hooks/, server/, params.ts, types.ts
- Shared UI in `src/components/ui/`
- Inngest logic in `src/inngest/`
- tRPC routers in `src/trpc/routers/`
- API routes in `src/app/api/`

## Node file pattern (5 files, always)
```
src/features/{executions|triggers}/components/{node-name}/
├── node.tsx        # React Flow visual component
├── dialog.tsx      # Config dialog (React Hook Form + Zod)
├── actions.ts      # Server actions (realtime tokens)
├── executor.ts     # Business logic (Inngest or Upstash)
└── channel.ts      # Realtime channel definition
```

## Adding a new node (5 registration locations)
1. `prisma/schema.prisma` — add to NodeType enum
2. `src/config/node-components.ts` — register React component
3. `src/features/executions/lib/executor-registry.ts` — register executor
4. `src/inngest/functions.ts` — add channel
5. `src/components/node-selector.tsx` — add to UI list

## tRPC patterns
- `protectedProcedure` — requires auth
- `organizationProcedure` — requires auth + org membership
- `adminProcedure` — requires owner or admin role
- `ownerProcedure` — requires owner role
- `premiumProcedure` — requires active subscription
- All resource endpoints use `organizationProcedure`
- Access org via `ctx.organizationId`, user via `ctx.auth.user.id`

## Auth guards
- Server components: `requireAuth()` — redirects if not authed
- All resources are organization-scoped

## Realtime pattern (current — Inngest)
```typescript
// channel.ts
export const myNodeChannel = channel("my-node-execution")
  .addTopic(topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>());

// executor.ts
await publish(myNodeChannel().status({ nodeId, status: "loading" }));

// component
const nodeStatus = useNodeStatus({
  nodeId: props.id,
  channel: MY_NODE_CHANNEL_NAME,
  topic: "status",
  refreshToken: fetchMyNodeRealtimeToken,
});
```

## Chat streaming (in progress — Upstash)
Inngest stays for automation workflows. Upstash handles chat workflows only.

### New services being added
- `@upstash/workflow` — durable execution for chat workflows
- `@upstash/qstash` — background job trigger for inbound messages
- `@upstash/realtime` — Redis pub/sub → SSE for web chat
- `@upstash/redis` — session/conversation state per channel+user

### Unified chat architecture (all channels)
```
Inbound message (webhook or UI)
  → POST /api/chat/trigger → QStash.trigger() → returns runId immediately
  → QStash invokes /api/chat/run in background
  → executeWorkflow(nodes, edges, input, context) runs node graph
  → Each node emits chunks via context.channel.emit("workflow.chunk", {...})
  → Delivery differs per channelType:
      web       → SSE via Upstash Realtime → client EventSource
      whatsapp  → collect full output → call WhatsApp API at end node
      instagram → collect full output → call Instagram API at end node
      tiktok    → collect full output → call TikTok API at end node
      discord   → collect full output → call Discord API at end node
```

### ExecutorContext shape for chat nodes
```typescript
type ChatExecutorContext = {
  outputs: Record<string, any>
  history: UIMessage[]
  workflowRunId: string
  channel: RealtimeChannel
  channelType: "web" | "whatsapp" | "instagram" | "tiktok" | "discord"
  userId: string
  sessionId: string
  organizationId: string
}
```

### Session state (Redis)
- Key pattern: `session:{channelType}:{userId}`
- Value: `UIMessage[]` capped at 20 messages
- Load before executeWorkflow, save after

### New env vars needed
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=
QSTASH_BASE_URL=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
```

## Context passing between nodes
```typescript
let context = { initialData: {} };
// Each node adds to context:
context = { ...context, myNode: { output: {...} } };
// Next node accesses:
const value = context.myNode.output.someField;
```

## Template variables (Handlebars)
- Simple: `{{variableName.path}}`
- JSON: `{{json variableName.object}}`

## Styling rules
- Tailwind v4 — config in `src/app/globals.css`, no `tailwind.config.ts`
- CSS variables for theming, `@theme` directive
- shadcn/ui New York variant

## Code style
- TypeScript strict, no `any`
- No comments unless explaining non-obvious logic
- Explicit types on all function signatures
- Biome formatting — no unused imports
- All components use `memo`
- Zod schemas for all input validation
- Never expose env secrets to client

## What NOT to change
- Inngest setup for automation workflows
- Existing node executors
- tRPC router structure
- Better Auth setup
- Prisma schema (unless adding new node types)
- React Flow canvas and node rendering