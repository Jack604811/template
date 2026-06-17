import { bookablesRouter } from '@/features/bookables/server/bookables-router';
import { bookableCollectionsRouter } from '@/features/bookables/server/routers';
import { customerRouter } from '@/features/bookings/server/customer-router';
import { bookingsRouter } from '@/features/bookings/server/routers';
import { chatRouter } from '@/features/chat/server/router';
import { credentialsRouter } from '@/features/credentials/server/routers';
import { customFieldsRouter } from '@/features/custom-fields/server/routers';
import { executionsRouter } from '@/features/executions/server/routers';
import { mcpRouter } from '@/features/mcp/server/routers';
import { organizationsRouter } from '@/features/organizations/server/routers';
import { templatesRouter } from '@/features/templates/server/routers';
import { workflowsRouter } from '@/features/workflows/server/routers';
import { createTRPCRouter } from '../init';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  workflows: workflowsRouter,
  templates: templatesRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  organizations: organizationsRouter,
  bookings: bookingsRouter,
  customers: customerRouter,
  bookables: bookablesRouter,
  bookableCollections: bookableCollectionsRouter,
  customFields: customFieldsRouter,
  mcp: mcpRouter,
});
export type AppRouter = typeof appRouter;
