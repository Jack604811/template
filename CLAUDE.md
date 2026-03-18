# Nodebase — Chat Streaming Architecture

## Context
Nodebase is a Next.js workflow automation platform using Inngest for background jobs
and Vercel AI SDK for AI nodes. We are adding real-time streaming chat support for
multiple channels: internal web chat (bubble + panel), WhatsApp, Instagram, TikTok,
Discord, and future channels.

## Current stack
- Next.js (App Router)
- Inngest (background jobs + step execution) — keep this for automations
- Vercel AI SDK v6
- Prisma + PostgreSQL
- Existing WhatsApp node via webhook

## What we are adding
### Upstash (new)
- @upstash/workflow — durable execution for chat workflows
- @upstash/qstash — background job trigger for all incoming messages
- @upstash/realtime — Redis pub/sub for streaming chunks to UI
- @upstash/redis — session/conversation state per channel+user

### New nodes
- Web Chat node (internal panel + embeddable bubble, like flow.ai)
- WhatsApp node (already exists, needs to adopt new architecture)
- Instagram node
- TikTok node
- Discord node

## Core architecture rule
Every channel follows the SAME pattern regardless of source:

1. Inbound message arrives (webhook or UI submit)
2. POST to /api/trigger → QStash.trigger() → returns runId immediately
3. QStash invokes /api/workflow/run in background
4. executeWorkflow(nodes, edges, input, channel, runId) runs the node graph
5. Each node emits chunks via channel.emit("workflow.chunk", {...}) as it runs
6. Output delivery differs per channel:
   - Web Chat: SSE stream via Upstash Realtime → client EventSource
   - WhatsApp/Instagram/TikTok/Discord: collect full output, call channel API at end node

## executeWorkflow context shape
The context passed to every node executor must include:
- outputs: Record<nodeId, any> — accumulated node outputs
- history: UIMessage[] — conversation history
- workflowRunId: string
- channel: RealtimeChannel — for emitting chunks
- channelType: "web" | "whatsapp" | "instagram" | "tiktok" | "discord"
- userId: string — the end user sending the message
- sessionId: string — conversation session (stored in Redis)

## Node file pattern (4 files per node, keep existing convention)
Every node must have:
- node.tsx — React Flow visual node component
- settings.tsx — settings panel
- executor.ts — server-side execution logic
- index.ts — exports

## Executor interface
Every executor receives (node: Node, context: ExecutorContextType) and returns:
{ output: any }

For streaming nodes (agent), emit chunks via context.channel during execution.
For non-streaming nodes (HTTP, if-else), just return output — no emit needed.

## Web Chat delivery (SSE)
- GET /api/workflow/chat?id=:runId → ReadableStream subscribed to Realtime channel
- Custom transport in lib/transport.ts → double fetch pattern (POST trigger → GET stream)
- Embeddable bubble: public/embed/embed.js injected via <script> tag

## External channel delivery (WhatsApp etc.)
- Webhook handler receives message → triggers QStash immediately (respond 200 fast)
- End node executor detects channelType and calls the appropriate platform API
- No SSE, no Realtime subscription needed
- Session state (conversation history) stored/retrieved from Upstash Redis by sessionId

## Session state pattern (Redis)
Key pattern: session:{channelType}:{userId}
Value: UIMessage[] (last N messages, cap at 20)
Always load session before executeWorkflow, save after.

## Environment variables needed
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=
QSTASH_BASE_URL=          # http://localhost:3000 in dev
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

## What NOT to change
- Inngest setup — keep for non-chat automation workflows
- Existing node executors (Gmail, Slack, Discord automation nodes)
- Prisma schema for workflows
- React Flow canvas and node rendering
- Existing WhatsApp webhook handler structure (only adapt to new trigger pattern)

## Code style
- TypeScript strict
- No comments unless explaining non-obvious logic
- Prefer explicit types over inference for function signatures
- Keep executors pure — no side effects outside of channel.emit and context.outputs

## Architecture reference
See ARCHITECTURE.md for full system architecture details.