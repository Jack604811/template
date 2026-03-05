import ora from "ora";
import { logger } from "../utils/logger.js";
import { getManifest } from "../utils/version-tracker.js";

export async function checkUpdatesCommand() {
  const spinner = ora();

  try {
    spinner.start("Checking for updates...");
    const manifest = await getManifest(".");

    const outdated: Array<{
      type: string;
      name: string;
      current: string;
      latest: string;
    }> = [];

    // Check nodes
    for (const [nodeName, version] of Object.entries(manifest.nodes)) {
      const latest = await getLatestVersion("node", nodeName);
      if (latest && latest !== version) {
        outdated.push({
          type: "node",
          name: nodeName,
          current: version as string,
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
          current: version as string,
          latest,
        });
      }
    }

    spinner.succeed("Update check complete");
    logger.newLine();

    if (outdated.length === 0) {
      logger.success("✨ All components are up to date!");
      return;
    }

    logger.warn(`Found ${outdated.length} outdated component(s):`);
    logger.newLine();

    for (const item of outdated) {
      logger.log(
        `  📦 ${item.name} (${item.type})`,
      );
      logger.log(`     Current: ${item.current} → Latest: ${item.latest}`);
      logger.newLine();
    }

    logger.info("Run 'nodebase update <name>' to update a component");
    logger.info("Run 'nodebase update --all' to update all components");
  } catch (error) {
    spinner.fail("Failed to check updates");
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function getLatestVersion(
  type: string,
  name: string,
): Promise<string | null> {
  // In a real implementation, this would fetch from a registry or git repo
  // For now, return mock version
  // This should check against the templates directory or a remote registry
  return "1.1.0";
}

