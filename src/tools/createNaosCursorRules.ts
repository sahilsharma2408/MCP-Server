import { basename, join } from 'path';
import {
  existsSync,
  unlinkSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  handleError,
  DESIGN_TOKENS_DIRECTORY,
  areTokensOutdated,
  analyticsToolCallEventName,
} from '../utils.js';
import { sendAnalytics } from '../utils/analyticsUtils.js';
import { getUserName } from '../utils/getUserName.js';

const createNaosCursorRulesToolName = 'create_naos_cursor_rules';

const createNaosCursorRulesToolDescription =
  'Creates the cursor rules for naos to help with code generation. Call this before get_naos_docs and while creating a new naos project (only when using cursor and when the frontend-naos-rules.mdc rule does not already exist).';

const createNaosCursorRulesToolSchema = {
  currentProjectRootDirectory: z
    .string()
    .describe(
      "The working root directory of the consumer's project. Do not use root directory, do not use '.', only use absolute path to current directory",
    ),
};

const createNaosCursorRulesToolCallback: ToolCallback<
  typeof createNaosCursorRulesToolSchema
> = ({
  currentProjectRootDirectory,
}: {
  currentProjectRootDirectory: string;
}) => {
  try {
    const ruleFileDir = join(currentProjectRootDirectory, '.cursor/rules');
    const ruleFilePath = join(ruleFileDir, 'frontend-naos-rules.mdc');

    if (existsSync(ruleFilePath)) {
      if (areTokensOutdated(ruleFilePath)) {
        // Remove outdated rules and regenerate
        unlinkSync(ruleFilePath);
      } else {
        return {
          content: [
            {
              type: 'text',
              text: 'Cursor rules are up to date. Doing nothing',
            },
          ],
        };
      }
    }

    const tokenFilePath = join(DESIGN_TOKENS_DIRECTORY, 'index.css');
    const packageJsonPath = join(DESIGN_TOKENS_DIRECTORY, '..', 'package.json');

    let ruleFileTemplateContent = readFileSync(tokenFilePath, 'utf8');

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    ruleFileTemplateContent = `/* Created with @dtsl/css-design-token@${packageJson.version} */\n${ruleFileTemplateContent}`;
    if (!existsSync(ruleFileDir)) {
      mkdirSync(ruleFileDir, { recursive: true });
    }

    writeFileSync(ruleFilePath, ruleFileTemplateContent);

    sendAnalytics({
      eventName: analyticsToolCallEventName,
      properties: {
        toolName: createNaosCursorRulesToolName,
        cursorRulesVersion: packageJson.version,
        rootDirectoryName: basename(currentProjectRootDirectory),
        userName: getUserName(currentProjectRootDirectory),
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Naos cursor rules created at: ${ruleFilePath}. Cursor Rules Version: ${packageJson.version}`,
        },
      ],
    };
  } catch (error: unknown) {
    return handleError({
      toolName: createNaosCursorRulesToolName,
      errorObject: error,
    });
  }
};

export {
  createNaosCursorRulesToolName,
  createNaosCursorRulesToolDescription,
  createNaosCursorRulesToolSchema,
  createNaosCursorRulesToolCallback,
};
