import path from "node:path";
import ora from "ora";
import {
  copyFile,
  ensureDir,
  getTemplatePath,
} from "../utils/file-operations.js";
import { logger } from "../utils/logger.js";
import { promptFeatureDetails, promptNodeDetails } from "../utils/prompts.js";
import {
  kebabToCamel,
  kebabToPascal,
  kebabToSnakeUpper,
} from "../utils/string-utils.js";
import {
  addFeatureToManifest,
  addNodeToManifest,
} from "../utils/version-tracker.js";

export async function addCommand(type?: string) {
  if (!type) {
    logger.error("Please specify a type: node or feature");
    logger.info("Usage: nodebase add <type>");
    process.exit(1);
  }

  if (type === "node") {
    await addNode();
  } else if (type === "feature") {
    await addFeature();
  } else {
    logger.error(`Unknown type: ${type}`);
    logger.info("Available types: node, feature");
    process.exit(1);
  }
}

async function addNode() {
  logger.info("📦 Adding a new node...");
  logger.newLine();

  const details = await promptNodeDetails();

  if (!details.name) {
    logger.error("Node name is required");
    process.exit(1);
  }

  logger.newLine();
  const spinner = ora();

  try {
    const nodeName = details.name;
    const pascalName = kebabToPascal(nodeName);
    const camelName = kebabToCamel(nodeName);
    const upperSnakeName = kebabToSnakeUpper(nodeName);

    // Create directories
    const nodeDir =
      details.type === "trigger"
        ? `src/features/triggers/components/${nodeName}`
        : `src/features/executions/components/${nodeName}`;

    spinner.start("Creating directories...");
    await ensureDir(nodeDir);
    await ensureDir("src/inngest/channels");
    spinner.succeed("Directories created");

    // Generate node files
    spinner.start("Generating node files...");
    await generateNodeFile(nodeDir, nodeName, pascalName, details);
    await generateDialogFile(nodeDir, nodeName, pascalName, details);
    await generateActionsFile(nodeDir, nodeName, camelName, details);
    await generateExecutorFile(nodeDir, nodeName, camelName, details);
    await generateChannelFile(nodeName, camelName, upperSnakeName);
    spinner.succeed("Node files generated");

    // Add to manifest
    spinner.start("Updating manifest...");
    await addNodeToManifest(".", nodeName, "1.0.0");
    spinner.succeed("Manifest updated");

    logger.newLine();
    logger.success(`✨ Node "${nodeName}" added successfully!`);
    logger.newLine();
    logger.info("Next steps:");
    logger.log(`  1. Add ${pascalName}Node to src/config/node-components.ts`);
    logger.log(
      `  2. Add ${camelName}Executor to src/features/executions/lib/executor-registry.ts`,
    );
    logger.log(
      `  3. Add ${camelName}Channel() to src/inngest/functions.ts channels array`,
    );
    logger.log(
      `  4. Add ${nodeName.toUpperCase().replace(/-/g, "_")} to Prisma NodeType enum`,
    );
    logger.log(`  5. Add node to src/components/node-selector.tsx`);
    logger.log("  6. Run 'npx prisma generate' to update Prisma client");
    logger.newLine();
  } catch (error) {
    spinner.fail("Failed to add node");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function addFeature() {
  logger.info("📦 Adding a new feature...");
  logger.newLine();

  const details = await promptFeatureDetails();

  if (!details.name) {
    logger.error("Feature name is required");
    process.exit(1);
  }

  logger.newLine();
  const spinner = ora();

  try {
    const featureName = details.name;
    const displayName = details.displayName || kebabToPascal(featureName);

    // Create directories
    const featureDir = `src/features/${featureName}`;

    spinner.start("Creating directories...");
    await ensureDir(`${featureDir}/components`);
    if (details.includeHooks) {
      await ensureDir(`${featureDir}/hooks`);
    }
    if (details.includeServer) {
      await ensureDir(`${featureDir}/server`);
    }
    spinner.succeed("Directories created");

    // Generate feature files
    spinner.start("Generating feature files...");
    await generateFeatureFiles(featureDir, featureName, displayName, details);
    spinner.succeed("Feature files generated");

    // Add to manifest
    spinner.start("Updating manifest...");
    await addFeatureToManifest(".", featureName, "1.0.0");
    spinner.succeed("Manifest updated");

    logger.newLine();
    logger.success(`✨ Feature "${featureName}" added successfully!`);
    logger.newLine();
    if (details.includeServer) {
      const camelName = kebabToCamel(featureName);
      logger.info("Next steps:");
      logger.log(`  1. Add ${camelName}Router to src/trpc/routers/_app.ts`);
      logger.log("  2. Implement your feature logic");
      logger.newLine();
    }
  } catch (error) {
    spinner.fail("Failed to add feature");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

interface NodeDetails {
  name: string;
  type?: "trigger" | "execution";
}

interface FeatureDetails {
  name: string;
  displayName?: string;
  includeHooks?: boolean;
  includeServer?: boolean;
}

async function generateNodeFile(
  dir: string,
  _nodeName: string,
  pascalName: string,
  _details: NodeDetails,
): Promise<void> {
  await copyFile(
    getTemplatePath("node", "node.tsx.template"),
    path.join(dir, "node.tsx"),
    (c) => c.replace(/{{NODE_NAME}}/g, pascalName),
  );
}

async function generateDialogFile(
  dir: string,
  _nodeName: string,
  pascalName: string,
  _details: NodeDetails,
): Promise<void> {
  await copyFile(
    getTemplatePath("node", "dialog.tsx.template"),
    path.join(dir, "dialog.tsx"),
    (c) => c.replace(/{{NODE_NAME}}/g, pascalName),
  );
}

async function generateActionsFile(
  dir: string,
  _nodeName: string,
  camelName: string,
  _details: NodeDetails,
): Promise<void> {
  await copyFile(
    getTemplatePath("node", "actions.ts.template"),
    path.join(dir, "actions.ts"),
    (c) => c.replace(/{{NODE_NAME}}/g, camelName),
  );
}

async function generateExecutorFile(
  dir: string,
  _nodeName: string,
  camelName: string,
  _details: NodeDetails,
): Promise<void> {
  await copyFile(
    getTemplatePath("node", "executor.ts.template"),
    path.join(dir, "executor.ts"),
    (c) => c.replace(/{{NODE_NAME}}/g, camelName),
  );
}

async function generateChannelFile(
  nodeName: string,
  camelName: string,
  upperSnakeName: string,
): Promise<void> {
  await copyFile(
    getTemplatePath("node", "channel.ts.template"),
    path.join("src/inngest/channels", `${nodeName}.ts`),
    (c) =>
      c
        .replace(/{{NODE_NAME}}/g, nodeName)
        .replace(/{{CAMEL_NAME}}/g, camelName)
        .replace(/{{UPPER_SNAKE_NAME}}/g, upperSnakeName),
  );
}

async function generateFeatureFiles(
  dir: string,
  featureName: string,
  displayName: string,
  details: FeatureDetails,
): Promise<void> {
  // Generate params.ts
  await copyFile(
    getTemplatePath("feature", "params.ts.template"),
    path.join(dir, "params.ts"),
    (c) =>
      c
        .replace(/{{FEATURE_NAME}}/g, featureName)
        .replace(/{{DISPLAY_NAME}}/g, displayName),
  );

  if (details.includeHooks) {
    await copyFile(
      getTemplatePath("feature", "hooks/use-feature-params.ts.template"),
      path.join(dir, "hooks", "use-feature-params.ts"),
      (c) => c.replace(/{{FEATURE_NAME}}/g, featureName),
    );
    await copyFile(
      getTemplatePath("feature", "hooks/use-feature.ts.template"),
      path.join(dir, "hooks", `use-${featureName}.ts`),
      (c) => c.replace(/{{FEATURE_NAME}}/g, featureName),
    );
  }

  if (details.includeServer) {
    await copyFile(
      getTemplatePath("feature", "server/prefetch.ts.template"),
      path.join(dir, "server", "prefetch.ts"),
      (c) => c.replace(/{{FEATURE_NAME}}/g, featureName),
    );
    await copyFile(
      getTemplatePath("feature", "server/routers.ts.template"),
      path.join(dir, "server", "routers.ts"),
      (c) => c.replace(/{{FEATURE_NAME}}/g, featureName),
    );
    await copyFile(
      getTemplatePath("feature", "server/params-loader.ts.template"),
      path.join(dir, "server", "params-loader.ts"),
      (c) => c.replace(/{{FEATURE_NAME}}/g, featureName),
    );
  }
}
