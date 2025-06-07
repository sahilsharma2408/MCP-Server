import { join } from 'path';
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
  Naos_CURSOR_RULES_FILE_PATH,
  hasOutDatedRules,
  CURSOR_RULES_VERSION,
  handleError,
} from '../utils.js';

const createNaosCursorRulesToolName = 'create_naos_cursor_rules';

const createNaosCursorRulesToolDescription =
  'Creates the cursor rules for naos to help with code generation. Call this before get_naos_docs and while creating a new naos project (only when using cursor and when the frontend-naos-rules.mdc rule does not already exist).';

const createNaosCursorRulesToolSchema = {
  currentProjectRootDirectory: z
    .string()
    .describe(
      "The working root directory of the consumer's project. Do not use root directory, do not use '.', only use absolute path to current directory"
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
      if (hasOutDatedRules(ruleFilePath)) {
        // removes the outdated rules file and continues execution to generate new rule file
        unlinkSync(ruleFilePath);
      } else {
        return {
          content: [
            { type: 'text', text: 'Cursor rules already exist. Doing nothing' },
          ],
        };
      }
    }

    const ruleFileTemplateContent = readFileSync(
      Naos_CURSOR_RULES_FILE_PATH,
      'utf8'
    ).replace(
      'rules_version: <!-- dynamic_version -->',
      `rules_version: ${CURSOR_RULES_VERSION}`
    );

    if (!existsSync(ruleFileDir)) {
      mkdirSync(ruleFileDir, { recursive: true });
    }

    writeFileSync(ruleFilePath, ruleFileTemplateContent);

    return {
      content: [
        {
          type: 'text',
          text: `Naos cursor rules created at: ${ruleFilePath}. Cursor Rules Version: ${CURSOR_RULES_VERSION}`,
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
