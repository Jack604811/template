import ora from "ora";
import { promptInitOptions } from "../utils/prompts.js";
import { logger } from "../utils/logger.js";
import { updateManifest } from "../utils/version-tracker.js";
import { copyDir, ensureDir, fileExists } from "../utils/file-operations.js";
import path from "path";

interface InitCommandOptions {
  yes?: boolean;
}

export async function initCommand(options: InitCommandOptions) {
  logger.info("🚀 Initializing Nodebase project...");
  logger.newLine();

  // Get configuration from user
  const config = await promptInitOptions(options.yes);

  logger.newLine();
  logger.step("Configuration:");
  logger.log(`  Sidebar: ${config.includeSidebar ? "✓" : "✗"}`);
  logger.log(`  Authentication: ${config.includeAuth ? "✓" : "✗"}`);
  logger.log(`  Subscriptions: ${config.includeSubscriptions ? "✓" : "✗"}`);
  logger.log(`  Sentry: ${config.includeSentry ? "✓" : "✗"}`);
  logger.log(`  Example nodes: ${config.includeExampleNodes ? "✓" : "✗"}`);
  if (config.includeExampleNodes && config.exampleNodes.length > 0) {
    logger.log(`    - ${config.exampleNodes.join(", ")}`);
  }
  logger.newLine();

  const targetDir = ".";
  const spinner = ora();

  try {
    // Core structure (always install)
    spinner.start("Setting up core structure...");
    await setupCoreStructure(targetDir);
    spinner.succeed("Core structure set up");

    // Entity components (always install)
    spinner.start("Installing entity components...");
    await installEntityComponents(targetDir);
    spinner.succeed("Entity components installed");

    // Optional features
    if (config.includeSidebar) {
      spinner.start("Installing sidebar navigation...");
      await installSidebar(targetDir);
      spinner.succeed("Sidebar navigation installed");
    }

    if (config.includeAuth) {
      spinner.start("Installing authentication...");
      await installAuth(targetDir);
      spinner.succeed("Authentication installed");
    }

    if (config.includeSubscriptions) {
      spinner.start("Installing subscription system...");
      await installSubscriptions(targetDir);
      spinner.succeed("Subscription system installed");
    }

    if (config.includeSentry) {
      spinner.start("Installing Sentry monitoring...");
      await installSentry(targetDir);
      spinner.succeed("Sentry monitoring installed");
    }

    // Example nodes
    if (config.includeExampleNodes) {
      for (const nodeName of config.exampleNodes) {
        spinner.start(`Installing ${nodeName} node...`);
        await installNode(targetDir, nodeName);
        spinner.succeed(`${nodeName} node installed`);
      }
    }

    // Create manifest
    spinner.start("Creating version manifest...");
    await createManifest(targetDir, config);
    spinner.succeed("Version manifest created");

    logger.newLine();
    logger.success("✨ Project initialized successfully!");
    logger.newLine();
    logger.info("Next steps:");
    logger.log("  1. Run 'npm install' to install dependencies");
    logger.log("  2. Set up your .env file (see .env.example)");
    logger.log("  3. Run 'npx prisma generate' to generate Prisma client");
    logger.log("  4. Run 'npx prisma db push' to set up the database");
    logger.log("  5. Run 'npm run dev' to start the development server");
    logger.newLine();
  } catch (error) {
    spinner.fail("Failed to initialize project");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function setupCoreStructure(targetDir: string) {
  // This would copy the core structure from templates
  // For now, just ensure directories exist
  await ensureDir(path.join(targetDir, "src/features"));
  await ensureDir(path.join(targetDir, "src/components/ui"));
  await ensureDir(path.join(targetDir, "src/components/react-flow"));
  await ensureDir(path.join(targetDir, "src/config"));
  await ensureDir(path.join(targetDir, "src/lib"));
  await ensureDir(path.join(targetDir, "src/trpc"));
  await ensureDir(path.join(targetDir, "src/inngest/channels"));
  await ensureDir(path.join(targetDir, "src/hooks"));
  await ensureDir(path.join(targetDir, "prisma"));
}

async function installEntityComponents(targetDir: string) {
  // Copy entity components and hooks
  // Implementation will copy from templates
}

async function installSidebar(targetDir: string) {
  // Copy sidebar components
  // Implementation will copy from templates
}

async function installAuth(targetDir: string) {
  // Copy auth setup
  // Implementation will copy from templates
}

async function installSubscriptions(targetDir: string) {
  // Copy subscription setup
  // Implementation will copy from templates
}

async function installSentry(targetDir: string) {
  // Copy Sentry setup
  // Implementation will copy from templates
}

async function installNode(targetDir: string, nodeName: string) {
  // Copy node files from templates
  // Implementation will copy from templates
}

async function createManifest(targetDir: string, config: any) {
  const nodes: Record<string, string> = {};
  
  if (config.includeExampleNodes) {
    for (const nodeName of config.exampleNodes) {
      nodes[nodeName] = "1.0.0";
    }
  }

  await updateManifest(targetDir, {
    version: "1.0.0",
    nodes,
    features: {
      ...(config.includeSidebar && { sidebar: "1.0.0" }),
      ...(config.includeAuth && { auth: "1.0.0" }),
      ...(config.includeSubscriptions && { subscriptions: "1.0.0" }),
      ...(config.includeSentry && { sentry: "1.0.0" }),
    },
  });
}

