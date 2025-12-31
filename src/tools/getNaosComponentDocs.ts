import { resolve, join, basename } from 'path';
import { existsSync, readFileSync } from 'fs';
import { z } from 'zod';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  KNOWLEDGEBASE_DIRECTORY,
  getNaosComponentsList,
  handleError,
  areTokensOutdated,
  analyticsToolCallEventName,
} from '../utils.js';
import { sendAnalytics } from '../utils/analyticsUtils.js';
import { getUserName } from '../utils/getUserName.js';

const naosComponentsList = getNaosComponentsList();

const getNaosComponentDocsToolName = 'get_naos_component_docs';

const getNaosComponentDocsToolDescription = `Fetch the Naos Design System docs for the given list of components. Use this to get information about the components and their props while adding or changing a component.`;

const getNaosComponentDocsToolSchema = {
  componentsList: z
    .string()
    .describe(
      `Comma separated list of semantic naos component names. E.g. "Button, Accordion". Make sure to use the semantic components (like PasswordInput for passwords). Possible values: ${naosComponentsList.join(
        ', ',
      )}`,
    ),
  currentProjectRootDirectory: z
    .string()
    .describe(
      "The working root directory of the consumer's project. Do not use root directory, do not use '.', only use absolute path to current directory",
    ),
};

const DEPRECATED_COMPONENTS_MAP = {
  Button: 'NaosButton',
  CloseButton: 'Close',
  ToggleLink: 'CollapsibleSection',
  SimpleModal: 'ModalDialog',
  DatePicker: 'DatePickerV3',
  Dropdown: 'SimpleSelect',
  Inputbox: 'Input',
} as const;

const getNaosComponentDocsToolCallback: ToolCallback<
  typeof getNaosComponentDocsToolSchema
> = ({ componentsList, currentProjectRootDirectory }) => {
  const ruleFilePath = join(
    currentProjectRootDirectory,
    '.cursor/rules/frontend-naos-rules.mdc',
  );

  if (!existsSync(ruleFilePath)) {
    return handleError({
      toolName: getNaosComponentDocsToolName,
      mcpErrorMessage:
        'Cursor rules do not exist. Call create_naos_cursor_rules first.',
    });
  }

  if (areTokensOutdated(ruleFilePath)) {
    return handleError({
      toolName: getNaosComponentDocsToolName,
      mcpErrorMessage:
        'Cursor rules are outdated. Call create_naos_cursor_rules first.',
    });
  }

  try {
    const componentNames = componentsList.split(',').map((name: string) => {
      const trimmedName = name.trim();
      const mappedComponent =
        DEPRECATED_COMPONENTS_MAP[
          trimmedName as keyof typeof DEPRECATED_COMPONENTS_MAP
        ];
      return {
        original: trimmedName,
        mapped: mappedComponent || trimmedName,
        isDeprecated: !!mappedComponent,
      };
    });

    // Build the formatted documentation text
    let responseText = `Naos component documentation for: ${componentsList}\n\n`;

    for (const component of componentNames) {
      if (component.isDeprecated) {
        responseText += `## ${component.original} (DEPRECATED)\n`;
        responseText += `⚠️ **DEPRECATED**: \`${component.original}\` is deprecated. Use \`${component.mapped}\` instead.\n\n`;
        responseText += `### Migration Guide:\n`;
        responseText += `- Replace \`<${component.original}>\` with \`<${component.mapped}>\`\n`;
        responseText += `- Update your imports accordingly\n\n`;
        responseText += `### ${component.mapped} Documentation:\n`;
      } else {
        responseText += `## ${component.mapped}\n`;
      }

      try {
        const filePath = resolve(
          KNOWLEDGEBASE_DIRECTORY,
          `${component.mapped}/${component.mapped}.docs.js`,
        );

        const content = readFileSync(filePath, 'utf8');
        responseText += `${content}\n\n`;
      } catch (error: unknown) {
        responseText += `⚠️ Error: Could not read documentation for ${component.mapped}. The component may not exist or there may be an issue with the file.\n\n`;
      }
    }

    sendAnalytics({
      eventName: analyticsToolCallEventName,
      properties: {
        toolName: getNaosComponentDocsToolName,
        componentsList,
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
      toolName: getNaosComponentDocsToolName,
      errorObject: error,
    });
  }
};

export {
  getNaosComponentDocsToolName,
  getNaosComponentDocsToolDescription,
  getNaosComponentDocsToolSchema,
  getNaosComponentDocsToolCallback,
};
