# Contributing to Nodebase

Thank you for your interest in contributing to Nodebase! This guide will help you add new nodes, features, and improvements to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Adding a New Node](#adding-a-new-node)
- [Adding a New Feature](#adding-a-new-feature)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/code-with-antonio/nodebase.git
   cd nodebase
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your environment variables

4. Generate Prisma client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Adding a New Node

### Using the CLI (Recommended)

The easiest way to add a new node is using the Nodebase CLI:

```bash
npx nodebase add node
```

Follow the interactive prompts to configure your node.

### Manual Process

If you prefer to create files manually, follow these steps:

#### 1. Create Node Files

Create a new folder in `src/features/executions/components/` (for action nodes) or `src/features/triggers/components/` (for trigger nodes):

```
src/features/executions/components/my-new-node/
├── node.tsx           # React component
├── dialog.tsx         # Configuration dialog
├── actions.ts         # Server actions
└── executor.ts        # Inngest executor
```

And a channel file:

```
src/inngest/channels/my-new-node.ts
```

#### 2. Implement Node Component

```tsx
// node.tsx
"use client";

import { memo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { MyIcon } from "lucide-react";
import { BaseExecutionNode } from "../base-execution-node";
import { MyNewNodeDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { MY_NEW_NODE_CHANNEL_NAME } from "@/inngest/channels/my-new-node";
import { fetchMyNewNodeRealtimeToken } from "./actions";

export const MyNewNode = memo((props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MY_NEW_NODE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchMyNewNodeRealtimeToken,
  });

  const handleSubmit = (values) => {
    setNodes((nodes) => nodes.map((node) => {
      if (node.id === props.id) {
        return { ...node, data: { ...node.data, ...values } };
      }
      return node;
    }));
  };

  return (
    <>
      <MyNewNodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        icon={MyIcon}
        name="My New Node"
        status={nodeStatus}
        description={props.data?.variableName || "Not configured"}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

MyNewNode.displayName = "MyNewNode";
```

#### 3. Implement Dialog

```tsx
// dialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Dialog, DialogContent, ... } from "@/components/ui/dialog";
import { Form, FormField, ... } from "@/components/ui/form";

const formSchema = z.object({
  variableName: z.string().min(1).regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  // Add your fields
});

export const MyNewNodeDialog = ({ open, onOpenChange, onSubmit, defaultValues }) => {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Add form fields */}
            <Button type="submit">Save</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

#### 4. Implement Server Actions

```ts
// actions.ts
"use server";

import { inngest } from "@/inngest/client";

export async function fetchMyNewNodeRealtimeToken(nodeId: string) {
  const token = await inngest.realtime.createToken({
    channels: [{
      name: "my-new-node-execution",
      topics: {
        status: { pattern: { nodeId } },
      },
    }],
  });
  return token;
}
```

#### 5. Implement Executor

```ts
// executor.ts
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { myNewNodeChannel } from "@/inngest/channels/my-new-node";

export const myNewNodeExecutor: NodeExecutor = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(myNewNodeChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("my-new-node", async () => {
      // Validate
      if (!data.variableName) {
        throw new NonRetriableError("Variable name required");
      }

      // Perform action
      const response = await doSomething(data);

      // Return updated context
      return {
        ...context,
        [data.variableName]: response,
      };
    });

    await publish(myNewNodeChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(myNewNodeChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
```

#### 6. Create Channel

```ts
// src/inngest/channels/my-new-node.ts
import { channel, topic } from "@inngest/realtime";

export const MY_NEW_NODE_CHANNEL_NAME = "my-new-node-execution";

export const myNewNodeChannel = channel(MY_NEW_NODE_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
```

#### 7. Register Node (5 Locations)

##### a. Prisma Schema

```prisma
// prisma/schema.prisma
enum NodeType {
  // ... existing types
  MY_NEW_NODE
}
```

Run `npx prisma generate` after updating.

##### b. Node Components Registry

```ts
// src/config/node-components.ts
import { MyNewNode } from "@/features/executions/components/my-new-node/node";

export const nodeComponents = {
  // ... existing nodes
  [NodeType.MY_NEW_NODE]: MyNewNode,
} as const satisfies NodeTypes;
```

##### c. Executor Registry

```ts
// src/features/executions/lib/executor-registry.ts
import { myNewNodeExecutor } from "../components/my-new-node/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  // ... existing executors
  [NodeType.MY_NEW_NODE]: myNewNodeExecutor,
};
```

##### d. Inngest Channels

```ts
// src/inngest/functions.ts
import { myNewNodeChannel } from "./channels/my-new-node";

export const executeWorkflow = inngest.createFunction(
  { ... },
  {
    event: "workflows/execute.workflow",
    channels: [
      // ... existing channels
      myNewNodeChannel(),
    ],
  },
  async ({ ... }) => { ... },
);
```

##### e. Node Selector

```ts
// src/components/node-selector.tsx
const executionNodes: NodeTypeOption[] = [
  // ... existing nodes
  {
    type: NodeType.MY_NEW_NODE,
    label: "My New Node",
    description: "What this node does",
    icon: "/logos/service.svg", // or lucide icon
  },
];
```

#### 8. Add Logo (if needed)

If using a custom logo, add it to `public/logos/service.svg`.

#### 9. Test Your Node

1. Run the dev server
2. Create a workflow
3. Add your new node
4. Configure it
5. Execute the workflow
6. Verify it works as expected

## Adding a New Feature

### Using the CLI (Recommended)

```bash
npx nodebase add feature
```

### Manual Process

#### 1. Create Feature Directory

```
src/features/my-feature/
├── components/
├── hooks/
├── server/
└── params.ts
```

#### 2. Create Hooks

```ts
// hooks/use-my-feature-params.ts
import { useQueryStates } from "nuqs";
import { myFeatureParams } from "../params";

export function useMyFeatureParams() {
  return useQueryStates(myFeatureParams);
}
```

```ts
// hooks/use-my-feature.ts
export const useSuspenseMyFeatures = () => { ... };
export const useCreateMyFeature = () => { ... };
export const useUpdateMyFeature = () => { ... };
export const useRemoveMyFeature = () => { ... };
```

#### 3. Create Server Files

```ts
// server/prefetch.ts
export const prefetchMyFeatures = (params) => { ... };
export const prefetchMyFeature = (id) => { ... };
```

```ts
// server/routers.ts
export const myFeatureRouter = createTRPCRouter({
  getMany: protectedProcedure.query(...),
  getOne: protectedProcedure.query(...),
  create: protectedProcedure.mutation(...),
  update: protectedProcedure.mutation(...),
  remove: protectedProcedure.mutation(...),
});
```

#### 4. Register Router

```ts
// src/trpc/routers/_app.ts
import { myFeatureRouter } from "@/features/my-feature/server/routers";

export const appRouter = createTRPCRouter({
  // ... existing routers
  myFeature: myFeatureRouter,
});
```

#### 5. Add Prisma Model

```prisma
// prisma/schema.prisma
model MyFeature {
  id        String   @id @default(cuid())
  userId    String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("my_feature")
}
```

Run:
```bash
npx prisma migrate dev --name add_my_feature
npx prisma generate
```

## Code Style

### Follow the `.cursorrules`

The project has comprehensive Cursor rules. Read them carefully.

### Key Conventions

- **Files**: kebab-case (`my-component.tsx`)
- **Components**: PascalCase (`MyComponent`)
- **Hooks**: camelCase with `use` prefix (`useMyHook`)
- **Constants**: UPPER_SNAKE_CASE (`MY_CONSTANT`)

### Always Use

- `memo` for React components
- `forwardRef` for reusable components
- Zod for validation
- TypeScript strict mode
- `"use client"` for client components

### Code Quality

- Run Biome before committing: `npm run lint`
- Format code: `npm run format`
- No `console.log` in production code
- Add JSDoc comments for complex functions

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### Writing Tests

- Place tests next to the code they test
- Use `.test.tsx` or `.test.ts` extension
- Test complex business logic
- Test hooks in isolation

## Pull Request Process

1. **Fork the repository** and create a branch from `main`

2. **Make your changes** following the code style and patterns

3. **Test your changes** thoroughly

4. **Update documentation** if needed

5. **Run linting**: `npm run lint`

6. **Commit your changes** with clear commit messages:
   ```
   feat: add gmail node
   fix: resolve workflow execution issue
   docs: update contributing guide
   ```

7. **Push to your fork** and submit a pull request

8. **Describe your changes** in the PR description:
   - What does this PR do?
   - Why is this change needed?
   - How did you test it?
   - Screenshots (if UI changes)

9. **Wait for review** and address any feedback

## Questions?

If you have questions or need help:

- Open an issue on GitHub
- Check existing issues and discussions
- Read the `ARCHITECTURE.md` for more details

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

Thank you for contributing to Nodebase! 🎉

