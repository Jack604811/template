import fs from "fs-extra";
import path from "path";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

export async function copyFile(
  src: string,
  dest: string,
  transform?: (content: string) => string,
): Promise<void> {
  const content = await fs.readFile(src, "utf-8");
  const finalContent = transform ? transform(content) : content;
  await fs.ensureDir(path.dirname(dest));
  await fs.writeFile(dest, finalContent);
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.copy(src, dest);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return await fs.readJson(filePath);
  } catch {
    return null;
  }
}

export async function writeJsonFile(
  filePath: string,
  data: any,
): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, data, { spaces: 2 });
}

export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}

export async function writeFile(
  filePath: string,
  content: string,
): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.remove(filePath);
}

export function getTemplatePath(...segments: string[]): string {
  return path.join(__dirname, "..", "..", "templates", ...segments);
}

export function getTargetPath(
  targetDir: string,
  ...segments: string[]
): string {
  return path.join(process.cwd(), targetDir, ...segments);
}

