You are syncing the built application back to Figma as part of the compound loop.
This closes the design-code gap: the Figma prototype is updated to reflect what was actually shipped.

The input is: $ARGUMENTS

## Prerequisites

Before running this, ensure:
1. The feature has been built, tested, reviewed, and merged (or PR approved)
2. The dev server can be started (check config/harness.config.yaml for stack details)
3. A Figma file key is available (from the original prototype URL or config)

## Step 1: Identify the Figma target

Check for the Figma file key in this order:
1. Explicit argument: if $ARGUMENTS contains a Figma URL, extract the fileKey
2. `design/ui-spec.md` — look for the Source: field (should contain the original Figma URL)
3. `config/harness.config.yaml` — check `compound_loop.figma_file_key`
4. Ask the user for the Figma URL

Extract the fileKey from the URL. Store it for the capture step.

## Step 2: Identify pages to capture

Read `design/ui-spec.md` → Pages and Routes section.
Build a list of routes to capture (e.g. `/`, `/feedback`, `/feedback/new`).

## Step 3: Start the dev server

Read `config/harness.config.yaml` for the stack/framework to determine the dev command.
Start the dev server in the background. Wait for it to be ready.

Common patterns:
- Next.js: `npm run dev` → http://localhost:3000
- Vite: `npm run dev` → http://localhost:5173
- FastAPI + React: start both backend and frontend

Verify the server is running by checking the URL responds.

## Step 4: Capture and push each page to Figma

For each page/route identified in Step 2:

1. Call `generate_figma_design` WITHOUT outputMode first to get capture instructions
2. Follow the capture instructions — navigate to the correct URL
3. Call `generate_figma_design` with:
   - `outputMode: "existingFile"`
   - `fileKey: [the Figma file key from Step 1]`
   - The captureId from the initial call
4. Poll with captureId every 5 seconds until status is 'completed'

Each page gets pushed as a new page in the existing Figma file.

## Step 5: Update Code Connect mappings

Read the codebase to identify key components that were built.
For each major component:

1. Find its Figma node (from the captured design or original prototype)
2. Call `add_code_connect_map` or `send_code_connect_mappings` to link:
   - Figma node → source file path + component name
   - Use the appropriate label (React, Vue, etc. from config)

This means next time someone opens the Figma file, they see which code backs each component.

## Step 6: Stop the dev server

Kill the dev server process started in Step 3.

## Step 7: Report

```
🔄 FIGMA SYNC COMPLETE
File: [Figma URL]
Pages captured: [count]
Code Connect mappings: [count]
The prototype now reflects what was shipped.
Next iteration: PM can open this file in Figma Make and build on top.
```

Ask: "Review the updated Figma file. Does it look right? (or tell me what to adjust)"

## Error Handling

- If generate_figma_design fails: tell the user, suggest checking Figma MCP auth (`/mcp`)
- If dev server won't start: tell the user to start it manually and provide the URL
- If Code Connect mapping fails: skip it, report which components couldn't be mapped
