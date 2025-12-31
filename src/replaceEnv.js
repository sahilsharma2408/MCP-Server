// scripts/replace-env.js
import path from 'path';
import { fileURLToPath } from 'url';
import { replaceInFile } from 'replace-in-file';
import * as dotenv from 'dotenv';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the server.js file
const SERVER_JS_PATH = path.resolve(__dirname, '../dist/server.js');
// Define the path to the utils.js file
const UTILS_JS_PATH = path.resolve(__dirname, '../dist/utils.js');

// Load env variables from .env file (if exists) or use process.env
dotenv.config();

// Use environment variables with defaults
const NODE_ENV = process.env.NODE_ENV;

async function replaceEnvironmentVariables() {
  try {
    // Replace NODE_ENV
    await replaceInFile({
      files: SERVER_JS_PATH,
      from: /process\.env\.NODE_ENV\s*\?\?\s*['"]development['"]/g,
      to: `'${NODE_ENV}'`,
    });
  } catch (error) {
    console.error('Error during environment variables replacement:', error);
    process.exit(1);
  }
}

replaceEnvironmentVariables();
