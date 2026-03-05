#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { updateCommand } from "./commands/update.js";
import { checkUpdatesCommand } from "./commands/check-updates.js";

const program = new Command();

program
  .name("nodebase")
  .description("CLI tool for scaffolding Nodebase projects and components")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new Nodebase project structure")
  .option("-y, --yes", "Skip prompts and use defaults")
  .action(initCommand);

program
  .command("add")
  .description("Add a new component or node")
  .argument("[type]", "Type to add (node, feature)")
  .action(addCommand);

program
  .command("update")
  .description("Update existing components with diff preview")
  .argument("[name]", "Component name to update")
  .option("-a, --all", "Check and update all components")
  .option("-d, --dry-run", "Show what would change without modifying files")
  .action(updateCommand);

program
  .command("check-updates")
  .description("List outdated components")
  .action(checkUpdatesCommand);

program.parse();

