import ora from "ora";
import { diffLines } from "diff";
import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { getManifest } from "../utils/version-tracker.js";
import { selectFilesToUpdate } from "../utils/prompts.js";
import { readFile, writeFile, fileExists } from "../utils/file-operations.js";

interface UpdateCommandOptions {
  all?: boolean;
  dryRun?: boolean;
}

export async function updateCommand(
  name?: string,
  options: UpdateCommandOptions = {},
) {
  if (!name && !options.all) {
    logger.error("Please specify a component name or use --all");
    logger.info("Usage: nodebase update <name> or nodebase update --all");
    process.exit(1);
  }

  const spinner = ora();

  try {
    // Get current manifest
    spinner.start("Checking versions...");
    const manifest = await getManifest(".");
    spinner.succeed("Versions loaded");

    if (options.all) {
      // Check all components
      logger.info("Checking for updates...");
      logger.newLine();

      const outdated = await checkAllComponents(manifest);

      if (outdated.length === 0) {
        logger.success("All components are up to date!");
        return;
      }

      logger.warn(`Found ${outdated.length} outdated component(s):`);
      for (const item of outdated) {
        logger.log(`  - ${item.name}: ${item.current} → ${item.latest}`);
      }
      logger.newLine();

      if (options.dryRun) {
        logger.info("Dry run mode - no changes will be made");
        return;
      }

      // TODO: Implement selective update UI
      logger.info("Use 'nodebase update <name>' to update individual components");
    } else if (name) {
      // Update specific component
      await updateComponent(name, manifest, options.dryRun || false);
    }
  } catch (error) {
    spinner.fail("Failed to check updates");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function checkAllComponents(manifest: any): Promise<any[]> {
  const outdated: any[] = [];

  // Check nodes
  for (const [nodeName, version] of Object.entries(manifest.nodes)) {
    const latest = await getLatestVersion("node", nodeName);
    if (latest && latest !== version) {
      outdated.push({
        type: "node",
        name: nodeName,
        current: version,
        latest,
      });
    }
  }

  // Check features
  for (const [featureName, version] of Object.entries(manifest.features)) {
    const latest = await getLatestVersion("feature", featureName);
    if (latest && latest !== version) {
      outdated.push({
        type: "feature",
        name: featureName,
        current: version,
        latest,
      });
    }
  }

  return outdated;
}

async function updateComponent(
  name: string,
  manifest: any,
  dryRun: boolean,
) {
  const spinner = ora();

  // Determine type
  const isNode = name in manifest.nodes;
  const isFeature = name in manifest.features;

  if (!isNode && !isFeature) {
    logger.error(`Component "${name}" not found in manifest`);
    process.exit(1);
  }

  const type = isNode ? "node" : "feature";
  const currentVersion = isNode ? manifest.nodes[name] : manifest.features[name];
  const latestVersion = await getLatestVersion(type, name);

  if (!latestVersion || currentVersion === latestVersion) {
    logger.success(`${name} is already up to date (${currentVersion})`);
    return;
  }

  logger.info(`Updating ${name}: ${currentVersion} → ${latestVersion}`);
  logger.newLine();

  // Get changed files
  spinner.start("Analyzing changes...");
  const changedFiles = await getChangedFiles(type, name, currentVersion, latestVersion);
  spinner.succeed(`Found ${changedFiles.length} changed file(s)`);

  if (changedFiles.length === 0) {
    logger.success("No changes to apply");
    return;
  }

  // Show diffs
  logger.newLine();
  logger.info("Changes:");
  for (const file of changedFiles) {
    logger.log(`  - ${file}`);
  }
  logger.newLine();

  if (dryRun) {
    logger.info("Dry run mode - no changes will be made");
    return;
  }

  // Select files to update
  const filesToUpdate = await selectFilesToUpdate(changedFiles);

  if (filesToUpdate.length === 0) {
    logger.warn("No files selected for update");
    return;
  }

  // Apply updates
  spinner.start("Applying updates...");
  for (const file of filesToUpdate) {
    await applyFileUpdate(type, name, file, latestVersion);
  }
  spinner.succeed("Updates applied");

  logger.newLine();
  logger.success(`✨ ${name} updated to ${latestVersion}`);
}

async function getLatestVersion(type: string, name: string): Promise<string | null> {
  // In a real implementation, this would fetch from a registry or git repo
  // For now, return mock version
  return "1.1.0";
}

async function getChangedFiles(
  type: string,
  name: string,
  currentVersion: string,
  latestVersion: string,
): Promise<string[]> {
  // In a real implementation, this would compare versions and return changed files
  // For now, return mock files
  if (type === "node") {
    return ["node.tsx", "dialog.tsx", "executor.ts"];
  }
  return ["components/main.tsx", "hooks/use-feature.ts"];
}

async function applyFileUpdate(
  type: string,
  name: string,
  file: string,
  version: string,
) {
  // In a real implementation, this would fetch and apply the file update
  // For now, just log
  logger.info(`Updating ${file}...`);
}

function showDiff(oldContent: string, newContent: string, filename: string) {
  const diff = diffLines(oldContent, newContent);

  logger.log(chalk.bold(`\n${filename}:`));
  diff.forEach((part) => {
    if (part.added) {
      logger.log(chalk.green(`+ ${part.value}`));
    } else if (part.removed) {
      logger.log(chalk.red(`- ${part.value}`));
    }
  });
}

