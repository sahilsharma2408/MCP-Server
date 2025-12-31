import { basename, join } from 'path';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  handleError,
  DESIGN_TOKENS_DIRECTORY,
  areTokensOutdated,
  analyticsToolCallEventName,
} from '../utils.js';
import { sendAnalytics } from '../utils/analyticsUtils.js';
import { getUserName } from '../utils/getUserName.js';

const getNaosTokensToolName = 'get_naos_design_tokens';

const getNaosTokensToolDescription = `Fetch the Naos Design System tokens from the guidelines directory. Use this to get information about design tokens like colors, typography, spacing, etc.`;

const getNaosTokensToolSchema = {
  tokenType: z
    .string()
    .optional()
    .describe(
      `Specific token type to fetch (e.g., "colors", "typography", "spacing"). If not provided, all available tokens will be returned. Possible values`,
    ),
  currentProjectRootDirectory: z
    .string()
    .describe(
      "The working root directory of the consumer's project. Do not use root directory, do not use '.', only use absolute path to current directory",
    ),
};
const getNaosTokensToolCallback: ToolCallback<
  typeof getNaosTokensToolSchema
> = ({ tokenType, currentProjectRootDirectory }) => {
  const ruleFilePath = join(
    currentProjectRootDirectory,
    '.cursor/rules/frontend-naos-rules.mdc',
  );

  if (!existsSync(ruleFilePath)) {
    return handleError({
      toolName: getNaosTokensToolName,
      mcpErrorMessage:
        'Cursor rules do not exist. Call create_naos_cursor_rules first.',
    });
  }

  if (areTokensOutdated(ruleFilePath)) {
    return handleError({
      toolName: getNaosTokensToolName,
      mcpErrorMessage:
        'Cursor rules are outdated. Call create_naos_cursor_rules first.',
    });
  }

  try {
    if (!existsSync(DESIGN_TOKENS_DIRECTORY)) {
      return handleError({
        toolName: getNaosTokensToolName,
        mcpErrorMessage:
          'Design tokens directory does not exist at the specified path.',
      });
    }

    const tokenFilePath = join(DESIGN_TOKENS_DIRECTORY, 'index.css');

    if (!existsSync(tokenFilePath)) {
      return handleError({
        toolName: getNaosTokensToolName,
        mcpErrorMessage: `Design tokens file not found at: ${tokenFilePath}`,
      });
    }

    const content = readFileSync(tokenFilePath, 'utf8');
    const parsedTokens = parseDesignTokensFromCSS(content);

    let responseText = 'Naos Design Tokens:\n\n';

    if (tokenType) {
      // Filter tokens by type
      const filteredTokens = filterTokensByType(parsedTokens, tokenType);

      if (Object.keys(filteredTokens).length === 0) {
        responseText += `⚠️ No tokens found for type: "${tokenType}"\n\n`;
        responseText += `Available token categories: ${Object.keys(
          parsedTokens,
        ).join(', ')}\n\n`;
      } else {
        responseText += `## ${tokenType} Tokens\n\n`;
        responseText += formatTokensForLLM(filteredTokens);
      }
    } else {
      // Return all tokens in organized format
      responseText += `Available token categories: ${Object.keys(
        parsedTokens,
      ).join(', ')}\n\n`;

      Object.entries(parsedTokens).forEach(([category, tokens]) => {
        responseText += `## ${category}\n\n`;
        responseText += formatTokensForLLM({ [category]: tokens });
      });
    }

    sendAnalytics({
      eventName: analyticsToolCallEventName,
      properties: {
        toolName: getNaosTokensToolName,
        tokenType,
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
      toolName: getNaosTokensToolName,
      errorObject: error,
    });
  }
};

// Helper function to parse CSS custom properties into categories
function parseDesignTokensFromCSS(
  cssContent: string,
): Record<string, Record<string, string>> {
  const tokens: Record<string, Record<string, string>> = {};

  // Extract all CSS custom properties
  const customPropertyRegex = /--([^:]+):\s*([^;]+);/g;
  let match;

  while ((match = customPropertyRegex.exec(cssContent)) !== null) {
    const [, propertyName, value] = match;
    const cleanName = propertyName.trim();
    const cleanValue = value.trim();

    // Categorize tokens based on naming patterns
    const category = categorizeToken(cleanName);

    if (!tokens[category]) {
      tokens[category] = {};
    }

    tokens[category][cleanName] = cleanValue;
  }

  return tokens;
}

// Helper function to categorize tokens based on naming conventions
function categorizeToken(tokenName: string): string {
  const name = tokenName.toLowerCase();

  // Define categorization rules based on common naming patterns
  if (
    name.includes('color') ||
    name.includes('bg') ||
    name.includes('text') ||
    name.includes('border') ||
    name.match(/-(red|blue|green|yellow|purple|orange|gray|black|white)-/)
  ) {
    return 'colors';
  }

  if (
    name.includes('font') ||
    name.includes('text') ||
    name.includes('letter') ||
    name.includes('line-height') ||
    name.includes('weight')
  ) {
    return 'typography';
  }

  if (
    name.includes('space') ||
    name.includes('spacing') ||
    name.includes('margin') ||
    name.includes('padding') ||
    name.includes('gap')
  ) {
    return 'spacing';
  }

  if (name.includes('radius') || name.includes('rounded')) {
    return 'border-radius';
  }

  if (name.includes('shadow') || name.includes('elevation')) {
    return 'shadows';
  }

  if (name.includes('breakpoint') || name.includes('screen')) {
    return 'breakpoints';
  }

  if (
    name.includes('size') ||
    name.includes('width') ||
    name.includes('height')
  ) {
    return 'sizing';
  }

  if (
    name.includes('duration') ||
    name.includes('timing') ||
    name.includes('ease')
  ) {
    return 'animation';
  }

  if (name.includes('z-index') || name.includes('layer')) {
    return 'z-index';
  }

  // Default category for unmatched tokens
  return 'miscellaneous';
}

// Helper function to filter tokens by type
function filterTokensByType(
  allTokens: Record<string, Record<string, string>>,
  tokenType: string,
): Record<string, Record<string, string>> {
  const normalizedType = tokenType.toLowerCase();
  const filtered: Record<string, Record<string, string>> = {};

  Object.entries(allTokens).forEach(([category, tokens]) => {
    if (
      category.toLowerCase().includes(normalizedType) ||
      normalizedType.includes(category.toLowerCase())
    ) {
      filtered[category] = tokens;
    }
  });

  return filtered;
}

// Helper function to format tokens in an LLM-friendly way
function formatTokensForLLM(
  tokens: Record<string, Record<string, string>>,
): string {
  let formatted = '';

  Object.entries(tokens).forEach(([category, categoryTokens]) => {
    if (Object.keys(categoryTokens).length > 0) {
      formatted += `### ${category}\n\n`;

      Object.entries(categoryTokens).forEach(([name, value]) => {
        // Format for better readability
        formatted += `- **--${name}**: \`${value}\`\n`;
      });

      formatted += '\n';
    }
  });

  return formatted;
}

export {
  getNaosTokensToolName,
  getNaosTokensToolDescription,
  getNaosTokensToolSchema,
  getNaosTokensToolCallback,
};
