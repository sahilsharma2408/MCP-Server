import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT_DIRECTORY = join(__dirname, '..');
let cachedMachineId: string | null = null;

// Cursor Rules Tokens
const CURSOR_RULES_VERSION = '0.0.0';
const CURSOR_RULES_VERSION_STRING = `rules_version: ${CURSOR_RULES_VERSION}`;

const CURSOR_RULES_TEMPLATE_DIRECTORY = join(
  PROJECT_ROOT_DIRECTORY,
  'cursorRules'
);
const Naos_CURSOR_RULES_FILE_PATH = join(
  CURSOR_RULES_TEMPLATE_DIRECTORY,
  'frontend-naos-rules.mdc'
);

const KNOWLEDGEBASE_DIRECTORY = join(PROJECT_ROOT_DIRECTORY, 'knowledgebase');

const hasOutDatedRules = (ruleFilePath: string): boolean => {
  const ruleFileContent = readFileSync(ruleFilePath, 'utf8');
  return !ruleFileContent.includes(CURSOR_RULES_VERSION_STRING);
};

const getPackageJSONVersion = (): string => {
  const packageJson = JSON.parse(
    readFileSync(join(PROJECT_ROOT_DIRECTORY, 'package.json'), 'utf8')
  );
  return packageJson.version;
};

const getNaosComponentsList = (): string[] => {
  const componentsList: string[] = [];

  try {
    // Read all markdown files and strip the .md extension
    const files = readdirSync(KNOWLEDGEBASE_DIRECTORY);
    for (const file of files) {
      if (file.endsWith('.md')) {
        componentsList.push(file.replace('.md', '').trim());
      }
    }
  } catch (error: unknown) {
    console.error('Error reading knowledgebase directory:', error);
    return [];
  }

  return componentsList;
};

const handleError = ({
  toolName,
  errorObject,
  mcpErrorMessage = '',
}: {
  toolName: string;
  errorObject?: unknown;
  mcpErrorMessage?: string;
}): {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
} => {
  if (errorObject) {
    console.log('MCP Error in', toolName, ':', errorObject);
  }
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: errorObject
          ? `Error in ${toolName}: ${
              errorObject instanceof Error
                ? errorObject.message
                : String(errorObject)
            }`
          : mcpErrorMessage,
      },
    ],
  };
};

/**
 * Get MAC addresses from network interfaces
 */
const getMacAddresses = (): string[] => {
  try {
    const interfaces = os.networkInterfaces();
    const macAddresses: string[] = [];

    // Collect all non-internal MAC addresses
    Object.values(interfaces).forEach((networkInterface) => {
      if (networkInterface) {
        networkInterface.forEach((details) => {
          if (
            !details.internal &&
            details.mac &&
            details.mac !== '00:00:00:00:00:00'
          ) {
            macAddresses.push(details.mac);
          }
        });
      }
    });

    return macAddresses;
  } catch (error: unknown) {
    console.error('Error getting MAC addresses:', error);
    return [];
  }
};

/**
 * Create a hash from a string
 */
const createHashFromString = (input: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex').substring(0, 12);
};

/**
 * Generates a consistent machine ID based primarily on MAC addresses
 */
export const getUniqueIdentifier = (): string => {
  // Return cached ID if available
  if (cachedMachineId) {
    return cachedMachineId;
  }

  try {
    // Get MAC addresses from network interfaces
    const macAddresses = getMacAddresses();

    // If we have MAC addresses, use them to generate the ID
    if (macAddresses.length > 0) {
      // Create a hash of the MAC addresses
      const hash = crypto.createHash('sha256');
      hash.update(macAddresses.join('-'));

      // Generate deterministic machine ID
      const machineId = `blade-${hash.digest('hex').substring(0, 16)}`;

      cachedMachineId = machineId;
      return machineId;
    }

    // Fallback to hostname if no MAC addresses available
    const fallbackId = `blade-host-${createHashFromString(os.hostname())}`;
    cachedMachineId = fallbackId;
    return fallbackId;
  } catch (error: unknown) {
    console.error('Error generating unique identifier:', error);
    // Ultimate fallback if any errors occur
    const fallbackId = `blade-fallback-${Date.now()}`;
    cachedMachineId = fallbackId;
    return fallbackId;
  }
};

export {
  Naos_CURSOR_RULES_FILE_PATH,
  CURSOR_RULES_VERSION,
  KNOWLEDGEBASE_DIRECTORY,
  hasOutDatedRules,
  getPackageJSONVersion,
  getNaosComponentsList,
  handleError,
};
