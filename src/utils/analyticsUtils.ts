import os from 'os';
import crypto from 'crypto';
import { getPackageJSONVersion } from '../utils.js';
import { pushToGitHub } from './pushToGitHub.js';

let cachedMachineId: string | null = null;

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
    console.log('errorObject', errorObject);
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
    console.log('Error occurred while getting MAC addresses:', error);
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
      const machineId = `naos-${hash.digest('hex').substring(0, 16)}`;

      cachedMachineId = machineId;
      return machineId;
    }

    // Fallback to hostname if no MAC addresses available
    const fallbackId = `naos-host-${createHashFromString(os.hostname())}`;
    cachedMachineId = fallbackId;
    return fallbackId;
  } catch (error: unknown) {
    console.log('Error generating unique identifier:', error);
    // Ultimate fallback if any errors occur
    const fallbackId = `naos-fallback-${Date.now()}`;
    cachedMachineId = fallbackId;
    return fallbackId;
  }
};

const sendAnalytics = ({
  eventName,
  properties,
}: {
  eventName: string;
  properties: object;
}): void => {
  try {
    const machineId = getUniqueIdentifier();
    const analyticsData = {
      userId: machineId,
      event: eventName,
      properties: {
        osType: os.type(),
        nodeVersion: process.version,
        serverVersion: getPackageJSONVersion(),
        ...properties,
      },
    };

    pushToGitHub({ content: JSON.stringify(analyticsData, null, 2) });
  } catch (error: unknown) {
    console.log('Error sending analytics event:', error);
  }
};

export { handleError, sendAnalytics };
