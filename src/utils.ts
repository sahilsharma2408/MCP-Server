import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT_DIRECTORY = join(__dirname, '..');
let cachedMachineId: string | null = null;

const CURSOR_RULES_TEMPLATE_DIRECTORY = join(
  PROJECT_ROOT_DIRECTORY,
  'cursorRules',
);
const Naos_CURSOR_RULES_FILE_PATH = join(
  CURSOR_RULES_TEMPLATE_DIRECTORY,
  'frontend-naos-rules.mdc',
);

const require = createRequire(import.meta.url);

// Get the package's installed path
const getDocsCorePath = (): string => {
  try {
    const packagePath = require.resolve('@dtsl/docs-core/package.json');
    return join(dirname(packagePath), 'write-up', 'components', 'product');
  } catch (error) {
    console.error('Could not resolve @dtsl/docs-core package:', error);
    // Fallback to relative path
    return join(
      PROJECT_ROOT_DIRECTORY,
      '..',
      'docs',
      'core',
      'write-up',
      'components',
      'product',
    );
  }
};
// Get the package's installed path
const getDesignTokensPath = (): string => {
  try {
    const packagePath = require.resolve('@dtsl/css-design-tokens/package.json');
    return join(dirname(packagePath), 'dist');
  } catch (error) {
    console.error('Could not resolve @dtsl/css-design-tokens package:', error);
    // Fallback to relative path
    return '';
  }
};

const getNaosIconsPath = (): string => {
  try {
    const packagePath = require.resolve('@dtsl/icons/package.json');
    return join(dirname(packagePath), 'dist', 'icons', 'react', 'index.js');
  } catch (error) {
    console.error('Could not resolve @dtsl/icons package:', error);
    // Fallback to relative path
    return '';
  }
};

const KNOWLEDGEBASE_DIRECTORY = getDocsCorePath();
const DESIGN_TOKENS_DIRECTORY = getDesignTokensPath();
const ICONS_DIRECTORY = getNaosIconsPath();
const analyticsToolCallEventName = 'Naos MCP Tool Called';

// Add this function to check if tokens are outdated
function areTokensOutdated(ruleFilePath: string): boolean {
  try {
    // Read the current rule file to extract the version it was created with
    const currentRuleContent = readFileSync(ruleFilePath, 'utf8');

    // Extract version from rule file (you'll need to embed this when creating rules)
    const versionMatch = currentRuleContent.match(
      /\/\* Created with @dtsl\/css-design-token@([\d.]+) \*\//,
    );
    const lastUsedVersion = versionMatch?.[1];

    // Get current package version
    const packageJsonPath = join(DESIGN_TOKENS_DIRECTORY, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;

    return lastUsedVersion !== currentVersion;
  } catch (error) {
    // If we can't determine versions, assume outdated for safety
    return true;
  }
}

const getPackageJSONVersion = (): string => {
  const packageJson = JSON.parse(
    readFileSync(join(PROJECT_ROOT_DIRECTORY, 'package.json'), 'utf8'),
  );
  return packageJson.version;
};

const getNaosComponentsList = (): string[] => {
  const componentsList: string[] = [];
  try {
    // Read all files in the directory
    const files = readdirSync(KNOWLEDGEBASE_DIRECTORY);

    for (const file of files) {
      if (file.endsWith('.docs.js')) {
        try {
          // Read the content of each .docs.js file
          const filePath = join(KNOWLEDGEBASE_DIRECTORY, file);

          // Extract component name from filename
          const componentName = file.replace('.docs.js', '').trim();

          // You can process the file content here if needed

          componentsList.push(componentName);
        } catch (fileError: unknown) {
          console.error(`Error reading file ${file}:`, fileError);
          // Continue with other files even if one fails
        }
      }
    }
  } catch (error: unknown) {
    console.error('Error reading knowledgebase directory:', error);
    return [];
  }

  return componentsList;
};

const getNaosTokensList = (): string[] => {
  const tokensList: string[] = [];

  const readDirectoryRecursively = (
    dirPath: string,
    relativePath: string = '',
  ): void => {
    try {
      const items = readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const currentPath = join(dirPath, item.name);
        const tokenPath = relativePath
          ? `${relativePath}/${item.name}`
          : item.name;

        if (item.isDirectory()) {
          // Recursively read subdirectories
          readDirectoryRecursively(currentPath, tokenPath);
        } else if (
          item.isFile() &&
          (item.name.endsWith('.mdx') ||
            item.name.endsWith('.md') ||
            item.name.endsWith('.js'))
        ) {
          // Process files with the specified extensions
          try {
            // Extract token name from the full path and remove file extension
            const tokenName = item.name
              .replace(/\.stories.(mdx?|md|js)$/, '')
              .trim();

            if (tokenName.includes('marketing')) {
              continue;
            }

            tokensList.push(tokenName);
          } catch (fileError: unknown) {
            console.error(`Error reading file ${tokenPath}:`, fileError);
          }
        }
      }
    } catch (dirError: unknown) {
      console.error(`Error reading directory ${dirPath}:`, dirError);
    }
  };

  try {
    readDirectoryRecursively(DESIGN_TOKENS_DIRECTORY);
  } catch (error: unknown) {
    console.error('Error reading design tokens directory:', error);
    return [];
  }

  return tokensList;
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
    console.error('Error:', errorObject);
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
      const machineId = `Naos-${hash.digest('hex').substring(0, 16)}`;

      cachedMachineId = machineId;
      return machineId;
    }

    // Fallback to hostname if no MAC addresses available
    const fallbackId = `Naos-host-${createHashFromString(os.hostname())}`;
    cachedMachineId = fallbackId;
    return fallbackId;
  } catch (error: unknown) {
    // Ultimate fallback if any errors occur
    const fallbackId = `Naos-fallback-${Date.now()}`;
    cachedMachineId = fallbackId;
    return fallbackId;
  }
};

export {
  Naos_CURSOR_RULES_FILE_PATH,
  KNOWLEDGEBASE_DIRECTORY,
  DESIGN_TOKENS_DIRECTORY,
  ICONS_DIRECTORY,
  areTokensOutdated,
  getPackageJSONVersion,
  getNaosComponentsList,
  getNaosTokensList,
  handleError,
  analyticsToolCallEventName,
};
