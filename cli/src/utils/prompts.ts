import prompts from "prompts";

export interface InitOptions {
  includeSidebar: boolean;
  includeAuth: boolean;
  includeSubscriptions: boolean;
  includeSentry: boolean;
  includeExampleNodes: boolean;
  exampleNodes: string[];
}

export async function promptInitOptions(
  useDefaults: boolean = false,
): Promise<InitOptions> {
  if (useDefaults) {
    return {
      includeSidebar: true,
      includeAuth: true,
      includeSubscriptions: true,
      includeSentry: false,
      includeExampleNodes: true,
      exampleNodes: ["http-request", "gemini", "openai", "anthropic", "discord", "slack"],
    };
  }

  const response = await prompts([
    {
      type: "confirm",
      name: "includeSidebar",
      message: "Include sidebar navigation?",
      initial: true,
    },
    {
      type: "confirm",
      name: "includeAuth",
      message: "Include authentication (Better Auth)?",
      initial: true,
    },
    {
      type: "confirm",
      name: "includeSubscriptions",
      message: "Include subscription system (Polar)?",
      initial: true,
    },
    {
      type: "confirm",
      name: "includeSentry",
      message: "Include Sentry monitoring?",
      initial: false,
    },
    {
      type: "confirm",
      name: "includeExampleNodes",
      message: "Include example nodes?",
      initial: true,
    },
    {
      type: (prev) => (prev ? "multiselect" : null),
      name: "exampleNodes",
      message: "Select example nodes to include:",
      choices: [
        { title: "HTTP Request", value: "http-request", selected: true },
        { title: "Gemini AI", value: "gemini", selected: true },
        { title: "OpenAI", value: "openai", selected: true },
        { title: "Anthropic", value: "anthropic", selected: true },
        { title: "Discord", value: "discord", selected: true },
        { title: "Slack", value: "slack", selected: true },
      ],
      instructions: false,
      hint: "- Space to select. Return to submit",
    },
  ]);

  return {
    includeSidebar: response.includeSidebar ?? true,
    includeAuth: response.includeAuth ?? true,
    includeSubscriptions: response.includeSubscriptions ?? true,
    includeSentry: response.includeSentry ?? false,
    includeExampleNodes: response.includeExampleNodes ?? false,
    exampleNodes: response.exampleNodes ?? [],
  };
}

export async function promptNodeDetails() {
  return await prompts([
    {
      type: "text",
      name: "name",
      message: "Node name (kebab-case):",
      validate: (value) =>
        /^[a-z]+(-[a-z]+)*$/.test(value) || "Must be kebab-case",
    },
    {
      type: "text",
      name: "label",
      message: "Display label:",
    },
    {
      type: "text",
      name: "description",
      message: "Description:",
    },
    {
      type: "select",
      name: "type",
      message: "Node type:",
      choices: [
        { title: "Execution Node", value: "execution" },
        { title: "Trigger Node", value: "trigger" },
      ],
    },
    {
      type: "text",
      name: "icon",
      message: "Icon (lucide icon name or path to svg):",
      initial: "BoxIcon",
    },
  ]);
}

export async function promptFeatureDetails() {
  return await prompts([
    {
      type: "text",
      name: "name",
      message: "Feature name (kebab-case):",
      validate: (value) =>
        /^[a-z]+(-[a-z]+)*$/.test(value) || "Must be kebab-case",
    },
    {
      type: "text",
      name: "displayName",
      message: "Display name (PascalCase):",
      validate: (value) =>
        /^[A-Z][a-zA-Z]*$/.test(value) || "Must be PascalCase",
    },
    {
      type: "confirm",
      name: "includeHooks",
      message: "Include hooks?",
      initial: true,
    },
    {
      type: "confirm",
      name: "includeServer",
      message: "Include server-side code (tRPC router)?",
      initial: true,
    },
  ]);
}

export async function confirmOverwrite(filePath: string): Promise<boolean> {
  const response = await prompts({
    type: "confirm",
    name: "overwrite",
    message: `File ${filePath} already exists. Overwrite?`,
    initial: false,
  });

  return response.overwrite ?? false;
}

export async function selectFilesToUpdate(
  files: string[],
): Promise<string[]> {
  const response = await prompts({
    type: "multiselect",
    name: "files",
    message: "Select files to update:",
    choices: files.map((file) => ({
      title: file,
      value: file,
      selected: true,
    })),
    instructions: false,
    hint: "- Space to select. Return to submit",
  });

  return response.files ?? [];
}

