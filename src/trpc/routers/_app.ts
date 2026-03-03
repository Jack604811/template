import { createTRPCRouter } from '../init';
import { workflowsRouter } from '@/features/workflows/server/routers';
import { templatesRouter } from '@/features/templates/server/routers';
import { credentialsRouter } from '@/features/credentials/server/routers';
import { executionsRouter } from '@/features/executions/server/routers';
import { organizationsRouter } from '@/features/organizations/server/routers';
import { bookingsRouter } from '@/features/bookings/server/routers';
import { customerRouter } from '@/features/bookings/server/customer-router';
import { bookableRouter } from '@/features/bookings/server/bookable-router';
import { bookableCollectionsRouter } from '@/features/bookables/server/routers';
import { bookablesRouter } from '@/features/bookables/server/bookables-router';
import { customFieldsRouter } from '@/features/custom-fields/server/routers';
import { mcpRouter } from '@/features/mcp/server/routers';

export const appRouter = createTRPCRouter({
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
// export type definition of API
export type AppRouter = typeof appRouter;
