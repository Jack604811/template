import path from "path";
import { readJsonFile, writeJsonFile } from "./file-operations.js";

export interface NodebaseManifest {
  version: string;
  nodes: Record<string, string>;
  features: Record<string, string>;
}

const MANIFEST_FILENAME = "nodebase.json";

export async function getManifest(
  targetDir: string = ".",
): Promise<NodebaseManifest> {
  const manifestPath = path.join(process.cwd(), targetDir, MANIFEST_FILENAME);
  const manifest = await readJsonFile<NodebaseManifest>(manifestPath);

  return (
    manifest || {
      version: "1.0.0",
      nodes: {},
      features: {},
    }
  );
}

export async function updateManifest(
  targetDir: string,
  updates: Partial<NodebaseManifest>,
): Promise<void> {
  const manifest = await getManifest(targetDir);
  const updated = { ...manifest, ...updates };

  const manifestPath = path.join(process.cwd(), targetDir, MANIFEST_FILENAME);
  await writeJsonFile(manifestPath, updated);
}

export async function addNodeToManifest(
  targetDir: string,
  nodeName: string,
  version: string = "1.0.0",
): Promise<void> {
  const manifest = await getManifest(targetDir);
  manifest.nodes[nodeName] = version;

  const manifestPath = path.join(process.cwd(), targetDir, MANIFEST_FILENAME);
  await writeJsonFile(manifestPath, manifest);
}

export async function addFeatureToManifest(
  targetDir: string,
  featureName: string,
  version: string = "1.0.0",
): Promise<void> {
  const manifest = await getManifest(targetDir);
  manifest.features[featureName] = version;

  const manifestPath = path.join(process.cwd(), targetDir, MANIFEST_FILENAME);
  await writeJsonFile(manifestPath, manifest);
}

export async function getNodeVersion(
  targetDir: string,
  nodeName: string,
): Promise<string | null> {
  const manifest = await getManifest(targetDir);
  return manifest.nodes[nodeName] || null;
}

export async function getFeatureVersion(
  targetDir: string,
  featureName: string,
): Promise<string | null> {
  const manifest = await getManifest(targetDir);
  return manifest.features[featureName] || null;
}

