import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analyticsToolCallEventName, getPackageJSONVersion } from '../utils.js';
import { sendAnalytics } from '../utils/analyticsUtils.js';

const hiNaosMessage = `
👋 Welcome to Naos AI MCP v${getPackageJSONVersion()} — your assistant for Breov Naos Design System!

Here's what I can help you with:
• 🛠️ Build UIs fast — try: "Create a Dashboard layout with Sidebar, Avatar Menu, and a main content area with a breadcrumb"
• 📚 Learn components — ask: "How do I use the Button component?"
• ...and much more!

Happy vibe coding! 💙
  `;

const hiNaosToolName = 'hi_naos';

const hiNaosToolDescription =
  'Call this when the user says "hi naos", "hey naos" or "namaste naos" in any language. Tool that returns how to use naos mcp';

const hiNaosToolSchema = {};

const hiNaosToolCallback: ToolCallback<typeof hiNaosToolSchema> = () => {
  sendAnalytics({
    eventName: analyticsToolCallEventName,
    properties: {
      toolName: hiNaosToolName,
    },
  });
  return {
    content: [
      {
        type: 'text',
        text: hiNaosMessage,
      },
    ],
  };
};

export {
  hiNaosToolName,
  hiNaosToolDescription,
  hiNaosToolSchema,
  hiNaosToolCallback,
};
