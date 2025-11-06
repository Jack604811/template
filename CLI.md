# Nodebase CLI

The Nodebase CLI is a command-line tool for scaffolding projects, adding components, and managing updates. It works similar to shadcn/ui - files are copied into your project and become your own.

## Installation

The CLI is included in the Nodebase repository. To use it:

```bash
# From the nodebase directory
cd cli
npm install
npm run build

# Or use directly without building
npm install
tsx src/index.ts <command>
```

## Commands

### `nodebase init`

Initialize a new Nodebase project with interactive prompts.

```bash
nodebase init
```

**Options:**
- `-y, --yes` - Skip prompts and use defaults

**What it does:**
- Sets up core project structure
- Installs selected features (sidebar, auth, subscriptions, etc.)
- Copies example nodes (optional)
- Creates `nodebase.json` manifest for version tracking

**Interactive Prompts:**

```
? Include sidebar navigation? (Y/n)
? Include authentication (Better Auth)? (Y/n)
? Include subscription system (Polar)? (Y/n)
? Include Sentry monitoring? (y/N)
? Include example nodes? (Y/n)
  [ ] HTTP Request
  [ ] AI Nodes (Gemini, OpenAI, Anthropic)
  [ ] Communication (Discord, Slack)
```

**Example:**

```bash
# Interactive mode
nodebase init

# Skip prompts (use defaults)
nodebase init --yes
```

**Output Structure:**

```
your-project/
├── src/
│   ├── features/
│   ├── components/
│   ├── config/
│   ├── lib/
│   ├── inngest/
│   └── trpc/
├── nodebase.json           # Version manifest
└── ...
```

### `nodebase add`

Add a new node or feature to your project.

```bash
nodebase add <type>
```

**Types:**
- `node` - Add a workflow node
- `feature` - Add a feature module

#### Adding a Node

```bash
nodebase add node
```

**Interactive Prompts:**

```
? Node name (kebab-case): gmail-send
? Display label: Send Email
? Description: Send an email via Gmail
? Node type: (Use arrow keys)
  ❯ Execution Node
    Trigger Node
? Icon (lucide icon name or path to svg): MailIcon
```

**What it does:**
1. Creates node files:
   - `node.tsx` - React component
   - `dialog.tsx` - Configuration dialog
   - `actions.ts` - Server actions
   - `executor.ts` - Inngest executor
   - `channel.ts` - Realtime channel (in `inngest/channels/`)

2. Updates `nodebase.json` manifest

3. Shows registration checklist:
   ```
   Next steps:
     1. Add GmailSendNode to src/config/node-components.ts
     2. Add gmailSendExecutor to src/features/executions/lib/executor-registry.ts
     3. Add gmailSendChannel() to src/inngest/functions.ts channels array
     4. Add GMAIL_SEND to Prisma NodeType enum
     5. Add node to src/components/node-selector.tsx
     6. Run 'npx prisma generate' to update Prisma client
   ```

**Example:**

```bash
nodebase add node

# Creates:
src/features/executions/components/gmail-send/
├── node.tsx
├── dialog.tsx
├── actions.ts
└── executor.ts

src/inngest/channels/gmail-send.ts
```

#### Adding a Feature

```bash
nodebase add feature
```

**Interactive Prompts:**

```
? Feature name (kebab-case): notifications
? Display name (PascalCase): Notifications
? Include hooks? (Y/n)
? Include server-side code (tRPC router)? (Y/n)
```

**What it does:**
1. Creates feature directory structure:
   - `components/` - React components
   - `hooks/` - Custom hooks (optional)
   - `server/` - tRPC router, prefetch, params-loader (optional)
   - `params.ts` - URL parameter definitions

2. Updates `nodebase.json` manifest

3. Shows registration checklist

**Example:**

```bash
nodebase add feature

# Creates:
src/features/notifications/
├── components/
├── hooks/
│   ├── use-notifications-params.ts
│   └── use-notifications.ts
├── server/
│   ├── prefetch.ts
│   ├── routers.ts
│   └── params-loader.ts
└── params.ts
```

### `nodebase update`

Update existing components with interactive diff preview.

```bash
nodebase update [name]
```

**Options:**
- `-a, --all` - Check and update all components
- `-d, --dry-run` - Show what would change without modifying files

**How it works:**

1. **Check versions** against your `nodebase.json` manifest
2. **Show diff preview** of what changed
3. **Let you select** which files to update
4. **Apply updates** while preserving customizations

**Examples:**

```bash
# Update specific component
nodebase update gmail-send

# Output:
Updating gmail-send: 1.0.0 → 1.2.0

Changes:
  - dialog.tsx (Added CC field)
  - executor.ts (Fixed attachment bug)
  - node.tsx (Updated icon)

? Update gmail-send? (y/N) y
? Update which files?
  [x] dialog.tsx
  [ ] executor.ts (you customized this)
  [x] node.tsx

✨ gmail-send updated to 1.2.0
```

```bash
# Check all components
nodebase update --all

# Output:
Found 3 outdated component(s):
  - http-request: 1.0.0 → 1.1.0
  - gmail-send: 1.0.0 → 1.2.0
  - slack: 1.0.5 → 1.1.0

Use 'nodebase update <name>' to update individual components
```

```bash
# Dry run (no changes)
nodebase update gmail-send --dry-run

# Shows what would change without modifying files
```

### `nodebase check-updates`

List all outdated components.

```bash
nodebase check-updates
```

**Output:**

```
Found 2 outdated component(s):

  📦 http-request (node)
     Current: 1.0.0 → Latest: 1.1.0

  📦 sidebar (feature)
     Current: 1.0.0 → Latest: 2.0.0

Run 'nodebase update <name>' to update a component
Run 'nodebase update --all' to update all components
```

## Version Manifest (`nodebase.json`)

The CLI creates a `nodebase.json` file to track installed components and their versions:

```json
{
  "version": "1.0.0",
  "nodes": {
    "http-request": "1.0.0",
    "gmail-send": "1.2.0",
    "slack": "1.0.5"
  },
  "features": {
    "sidebar": "1.0.0",
    "auth": "2.0.0"
  }
}
```

**Purpose:**
- Track what's installed
- Check for updates
- Manage versions independently

**Don't edit manually** - let the CLI manage it.

## Templates

Templates are stored in `cli/templates/`:

```
cli/templates/
├── node/
│   ├── node.tsx.template
│   ├── dialog.tsx.template
│   ├── actions.ts.template
│   ├── executor.ts.template
│   ├── channel.ts.template
│   └── version.json
└── feature/
    ├── params.ts.template
    ├── hooks/
    ├── server/
    └── version.json
```

**Template Variables:**

Templates use `{{VARIABLE}}` syntax for substitution:

- `{{NODE_NAME}}` - PascalCase node name (e.g., `GmailSend`)
- `{{CAMEL_NAME}}` - camelCase name (e.g., `gmailSend`)
- `{{KEBAB_NAME}}` - kebab-case name (e.g., `gmail-send`)
- `{{UPPER_SNAKE_NAME}}` - UPPER_SNAKE_CASE (e.g., `GMAIL_SEND`)
- `{{PASCAL_NAME}}` - PascalCase (e.g., `GmailSend`)
- `{{DISPLAY_NAME}}` - Human-readable (e.g., `Send Email`)
- `{{ICON_NAME}}` - Icon component name
- `{{ICON_IMPORT}}` - Icon import statement
- `{{NODE_TYPE}}` - Execution or Trigger
- `{{FEATURE_NAME}}` - Feature description

## Workflow

### Starting a New Project

```bash
# 1. Initialize project
nodebase init

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your values

# 4. Set up database
npx prisma generate
npx prisma db push

# 5. Start development server
npm run dev
```

### Adding Components

```bash
# Add a node
nodebase add node

# Follow the prompts
# Register the node in 5 locations (CLI shows checklist)

# Test the node
npm run dev
```

### Keeping Components Updated

```bash
# Check for updates
nodebase check-updates

# Update specific component
nodebase update gmail-send

# See diff, select files to update
# Your customizations are preserved
```

## Best Practices

### 1. Use the CLI

Don't create files manually if the CLI can do it. It ensures consistency and saves time.

### 2. Review Updates

Always review the diff before applying updates. The CLI shows exactly what changes.

### 3. Commit Before Updating

Commit your changes before running `nodebase update` so you can easily revert if needed.

### 4. Customize After Copying

Files copied by the CLI are yours to modify. Customize them for your needs.

### 5. Track Your Manifest

Commit `nodebase.json` to version control so your team knows what's installed.

## Troubleshooting

### CLI Command Not Found

```bash
# Make sure you're in the cli directory
cd cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Or use tsx to run directly
npx tsx src/index.ts <command>
```

### Templates Not Found

The CLI looks for templates in `cli/templates/`. Make sure you're running the CLI from the correct directory.

### Update Fails

If an update fails:
1. Check your `nodebase.json` for syntax errors
2. Make sure you have the latest templates
3. Try `--dry-run` first to see what would change
4. Manually copy files if needed

### Version Conflicts

If you have version conflicts:
1. Check `nodebase.json` for the installed version
2. Run `nodebase check-updates` to see latest versions
3. Update components one at a time
4. Test after each update

## Examples

### Complete Node Addition

```bash
# 1. Add the node
nodebase add node

# Prompts:
? Node name: stripe-refund
? Display label: Refund Payment
? Description: Refund a Stripe payment
? Node type: Execution Node
? Icon: RefreshCwIcon

# 2. Register in 5 locations (follow checklist)

# 3. Update Prisma
npx prisma generate

# 4. Test
npm run dev
```

### Complete Feature Addition

```bash
# 1. Add the feature
nodebase add feature

# Prompts:
? Feature name: analytics
? Display name: Analytics
? Include hooks? Yes
? Include server-side code? Yes

# 2. Add Prisma model
# Edit prisma/schema.prisma

# 3. Generate and migrate
npx prisma migrate dev --name add_analytics
npx prisma generate

# 4. Register router
# Add to src/trpc/routers/_app.ts

# 5. Test
npm run dev
```

## Advanced Usage

### Custom Templates

You can modify templates in `cli/templates/` to match your preferences. The CLI will use your customized templates.

### Batch Operations

```bash
# Check multiple components
nodebase check-updates

# Update all at once
nodebase update --all

# Dry run on all
nodebase update --all --dry-run
```

### Integration with CI/CD

```bash
# In your CI pipeline
nodebase check-updates || echo "Updates available"

# Fail build if critical components are outdated
# (Custom script)
```

## FAQ

**Q: Do I need to use the CLI?**  
A: No, but it's highly recommended. It saves time and ensures consistency.

**Q: Can I customize generated files?**  
A: Yes! Files are copied into your project and become yours. Customize as needed.

**Q: How do updates work?**  
A: Like shadcn/ui - files are compared, diffs shown, you choose what to update.

**Q: What if I heavily customized a file?**  
A: Don't update it! The CLI lets you select which files to update.

**Q: Can I contribute templates?**  
A: Yes! Submit a PR with your improved templates.

## Support

- 📚 Read `ARCHITECTURE.md` for project structure
- 📖 Read `CONTRIBUTING.md` for contribution guidelines
- 🐛 Open an issue on GitHub for bugs
- 💬 Join discussions for questions

---

**Happy building with Nodebase! 🚀**

