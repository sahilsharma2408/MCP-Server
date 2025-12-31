import { basename, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  handleError,
  ICONS_DIRECTORY,
  areTokensOutdated,
  analyticsToolCallEventName,
} from '../utils.js';
import { sendAnalytics } from '../utils/analyticsUtils.js';
import { getUserName } from '../utils/getUserName.js';

const getNaosIconsToolName = 'get_naos_icons';

const getNaosIconsToolDescription = `Fetch the Naos Design System icons from the @dtsl/icons package. Returns available icon names, categories, and usage examples.`;

const getNaosIconsToolSchema = {
  iconName: z
    .string()
    .optional()
    .describe(
      `Specific icon name to fetch details for (e.g., "Activity", "ArrowDown", "CheckCircle"). If not provided, all available icons will be returned with categories.`,
    ),
  currentProjectRootDirectory: z
    .string()
    .describe(
      "The working root directory of the consumer's project. Do not use root directory, do not use '.', only use absolute path to current directory",
    ),
};

const getNaosIconsToolCallback: ToolCallback<typeof getNaosIconsToolSchema> = ({
  iconName,
  currentProjectRootDirectory,
}) => {
  const ruleFilePath = join(
    currentProjectRootDirectory,
    '.cursor/rules/frontend-naos-rules.mdc',
  );

  if (!existsSync(ruleFilePath)) {
    return handleError({
      toolName: getNaosIconsToolName,
      mcpErrorMessage:
        'Cursor rules do not exist. Call create_naos_cursor_rules first.',
    });
  }

  if (areTokensOutdated(ruleFilePath)) {
    return handleError({
      toolName: getNaosIconsToolName,
      mcpErrorMessage:
        'Cursor rules are outdated. Call create_naos_cursor_rules first.',
    });
  }

  try {
    if (!existsSync(ICONS_DIRECTORY)) {
      return handleError({
        toolName: getNaosIconsToolName,
        mcpErrorMessage:
          'Design tokens directory does not exist at the specified path.',
      });
    }

    // Read and parse the index file
    const indexContent = readFileSync(ICONS_DIRECTORY, 'utf8');
    const exportPattern =
      /export\s+{\s*default\s+as\s+(\w+)\s*}\s+from\s+['"]\.\/(.*?)['"];/g;
    const icons: Array<{ name: string; file: string }> = [];
    let match;

    while ((match = exportPattern.exec(indexContent)) !== null) {
      icons.push({
        name: match[1],
        file: match[2],
      });
    }

    // Categorize icons
    const categorizeIcon = (iconName: string): string => {
      const patterns = [
        { pattern: /^Arrow/, category: 'arrows' },
        { pattern: /^Chevron/, category: 'arrows' },
        { pattern: /^Corner/, category: 'arrows' },
        { pattern: /^Alert/, category: 'alerts' },
        { pattern: /^Status/, category: 'alerts' },
        { pattern: /^Warning|Error|Success|Info/, category: 'alerts' },
        { pattern: /^Align|Layout|Grid|Border/, category: 'layout' },
        { pattern: /^Line|Text|Format|Bold|Italic/, category: 'typography' },
        { pattern: /^Play|Pause|Stop|Volume|Music/, category: 'media' },
        { pattern: /^Phone|Mail|Message|Send/, category: 'communication' },
        { pattern: /^User|Profile|Contact/, category: 'users' },
        { pattern: /^File|Folder|Save|Upload|Download/, category: 'files' },
        { pattern: /^Settings|Tool|Gear/, category: 'settings' },
        { pattern: /^Check|X|Plus|Minus/, category: 'actions' },
        { pattern: /^Git|Github|Gitlab/, category: 'development' },
        { pattern: /^Facebook|Twitter|Instagram|Linkedin/, category: 'social' },
        { pattern: /^Apple|Google|Microsoft|Chrome/, category: 'brands' },
      ];

      for (const { pattern, category } of patterns) {
        if (pattern.test(iconName)) {
          return category;
        }
      }
      return 'other';
    };

    // Process icons with categories
    const categorizedIcons = icons.reduce((acc, icon) => {
      const cat = categorizeIcon(icon.name);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(icon);
      return acc;
    }, {} as Record<string, Array<{ name: string; file: string }>>);

    let responseText = '';

    // Handle specific icon request
    if (iconName) {
      const foundIcon = icons.find(
        (icon) => icon.name.toLowerCase() === iconName.toLowerCase(),
      );

      if (!foundIcon) {
        const suggestions = icons
          .filter((icon) =>
            icon.name.toLowerCase().includes(iconName.toLowerCase()),
          )
          .slice(0, 5)
          .map((icon) => icon.name);

        responseText = `❌ Icon "${iconName}" not found.\n\n`;
        if (suggestions.length > 0) {
          responseText += `**Did you mean:**\n${suggestions
            .map((s) => `- ${s}`)
            .join('\n')}\n\n`;
        }
        responseText += `**Total available icons:** ${icons.length}`;
      } else {
        const iconCategory = categorizeIcon(foundIcon.name);
        responseText = `# Icon: ${foundIcon.name}\n\n`;
        responseText += `**Category:** ${iconCategory}\n`;
        responseText += `**File:** ${foundIcon.file}.js\n\n`;
        responseText += `## Usage\n\n`;
        responseText += `\`\`\`tsx\nimport { ${foundIcon.name} } from '@dtsl/icons/dist/icons/react/${foundIcon.name}';\n\n`;
        responseText += `// Basic usage\n<${foundIcon.name} />\n\n`;
        responseText += `// With props\n<${foundIcon.name} size={24} color="currentColor" />\n\`\`\``;
      }
    }
    // Handle all icons request (default detailed format)
    else {
      const totalIcons = icons.length;
      const categoryCount = Object.keys(categorizedIcons).length;

      responseText = `# Naos Design System Icons\n\n`;
      responseText += `**Total Icons:** ${totalIcons}\n`;
      responseText += `**Categories:** ${categoryCount}\n\n`;

      responseText += `## Categories\n\n`;
      Object.entries(categorizedIcons)
        .sort(([, a], [, b]) => b.length - a.length)
        .forEach(([cat, catIcons]) => {
          responseText += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${
            catIcons.length
          })\n`;
          const displayIcons = catIcons.slice(0, 10);
          displayIcons.forEach((icon) => {
            responseText += `- **${icon.name}**\n`;
          });
          if (catIcons.length > 10) {
            responseText += `- *...and ${catIcons.length - 10} more*\n`;
          }
          responseText += '\n';
        });

      responseText += `\n---\n\n`;
      responseText += `💡 **Tip:** Use \`get_naos_icons\` with specific \`iconName\` parameter to get detailed usage for a specific icon.`;
    }

    sendAnalytics({
      eventName: analyticsToolCallEventName,
      properties: {
        toolName: getNaosIconsToolName,
        iconName,
        rootDirectoryName: basename(currentProjectRootDirectory),
        userName: getUserName(currentProjectRootDirectory),
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: responseText.trim(),
        },
      ],
    };
  } catch (error: unknown) {
    return handleError({
      toolName: getNaosIconsToolName,
      errorObject: error,
    });
  }
};

export {
  getNaosIconsToolName,
  getNaosIconsToolDescription,
  getNaosIconsToolSchema,
  getNaosIconsToolCallback,
};
