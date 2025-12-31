# `@dtsl/naos-mcp`

> Naos Design System - Model Context Protocol (MCP) Server - Provides AI-powered assistance and documentation access for the Brevo Design System components and patterns.

<a href="https://naos.brevo.design/@dtsl/docs-react/"><img src="https://img.shields.io/badge/storybook-mcp-ff69b4" alt="storybook" /></a>
<a href="https://github.com/dtsl/design-system/packages/naos-mcp"><img src="https://img.shields.io/badge/npm-latest-orange" alt="npm version" /></a>

## Introduction

The Naos MCP (Model Context Protocol) package provides an intelligent assistant for developers working with the Brevo Design System. It offers AI-powered support for component discovery, implementation guidance, migration assistance, and best practices recommendations.

## Features

- **Component Discovery**: Find the right design system component for your use case
- **Implementation Guidance**: Get step-by-step instructions for implementing components
- **Migration Assistance**: Automated help for migrating between component versions
- **Code Examples**: Access to comprehensive code examples and patterns
- **Documentation Access**: Quick access to component documentation and changelogs
- **Best Practices**: Recommendations for accessibility, responsive design, and component composition

## Install Package

Prerequisite before installation: [Configuring NPM GitHub Package Registry](https://www.notion.so/sendinblue/Steps-to-setup-design-systems-registry-token-bc9764a267014b7a8fe6a46737e408f8)

After installing [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) or [yarn](https://yarnpkg.com/en/docs/install), you can install `@dtsl/naos-mcp` globally with this command:

### Prerequisites

**For Brevo Employees**: You need to configure the @dtsl scope to use GitHub Package Registry. Follow these steps:

#### Step 1: Generate GitHub Personal Access Token

1. Visit [GitHub Token Settings](https://github.com/settings/tokens/new?scopes=repo,workflow,write:packages,read:repo_hook,write:packages)
2. Generate a Personal Access Token with the required scopes

#### Step 2: Configure Environment Variable

Add your token to your shell configuration:

```bash
# Open your shell configuration file
code ~/.bashrc  # for bash users
# OR
code ~/.zshrc   # for zsh users

# Add this line to the file:
export GITHUB_ACCESS_TOKEN="<YOUR_TOKEN>"
```

> **Note**: Replace `<YOUR_TOKEN>` with your actual GitHub Personal Access Token

Reload your shell configuration:

```bash
source ~/.bashrc  # for bash users
# OR
source ~/.zshrc   # for zsh users
```

#### Step 3: Configure NPM Registry

Update your `.npmrc` file:

```bash
# Open your npmrc file
code ~/.npmrc

# Add the following configuration:
@dtsl:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:always-auth=true
//npm.pkg.github.com/:_authToken=${GITHUB_ACCESS_TOKEN}
```

> **Important for Claude Desktop Users**: Claude Desktop runs as a GUI application and doesn't inherit environment variables from shell profiles (`.zshrc`, `.bashrc`). You must use the actual token value instead of the `${GITHUB_ACCESS_TOKEN}` variable in your `.npmrc` file.
>
> **Solution**: Replace the environment variable with your actual token:
>
> ```
> # Instead of this:
> //npm.pkg.github.com/:_authToken=${GITHUB_ACCESS_TOKEN}
>
> # Use this:
> //npm.pkg.github.com/:_authToken=ghp_your_actual_token_here
> ```
>
> **Alternative**: For global GUI app environment variables on macOS, add to `/etc/launchd.conf` or use a launch agent, but direct token substitution is simpler for most users.

#### Verification

Verify your configuration is working:

```bash
npm whoami --registry=https://npm.pkg.github.com/
```

### Installation

```sh
# with npm
npm i -g @dtsl/naos-mcp

# with yarn
yarn global add @dtsl/naos-mcp
```

## Usage and Development

### MCP Client Setup

The Naos MCP server can be used with various MCP-compatible clients. Here are the setup instructions for the most common ones:

#### VS Code (with MCP Extension)

To use the Naos MCP server with VS Code, you need to add it as an MCP server. Use the Command Palette (`Cmd+Shift+P`) and run:

1. **MCP: Open User Configuration** command
2. Copy paste the below code:

```json
{
  "servers": {
    "naos-mcp": {
      "command": "npx",
      "args": ["-y", "@dtsl/naos-mcp@latest"],
      "type": "stdio",
      "env": {
        "GITHUB_TOKEN": "<< Personal access token >>"
      }
    }
  },
  "inputs": []
}
```

Alternatively, if you have a compatible MCP client extension, you can enable MCP support in your `settings.json`:

```json
{
  "chat.mcp.enabled": true
}
```

#### Claude Desktop

#### 1. Locate Claude Desktop Config File

Find your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### 2. Edit the Configuration File

Open the `claude_desktop_config.json` file and add the naos-mcp server configuration:

```json
{
  "mcpServers": {
    "naos-mcp": {
      "command": "npx",
      "args": ["@dtsl/naos-mcp@latest"],
      "type": "stdio",
      "env": {
        "GITHUB_TOKEN": "<< Personal access token >>"
      }
    }
  }
}
```

If you already have other MCP servers configured, add the naos-mcp entry to the existing mcpServers object.

#### 3. Restart Claude Desktop

Close and restart the Claude Desktop application completely for the changes to take effect.

#### 4. Verify the Setup

Test that naos-mcp is working by typing "hi naos" in a new conversation. You should see a welcome message confirming the integration is active.

> **Note**: This setup uses `npx` to automatically download and run the latest version without requiring global installation. This ensures you always get the most up-to-date version of the MCP server.

For more detailed information about MCP setup and troubleshooting, refer to the [official MCP documentation](https://modelcontextprotocol.io/quickstart/user).

### Alternative: Local Development Setup

If you're developing the MCP server locally, you can point to your local build:

```json
{
  "mcpServers": {
    "naos-mcp-local": {
      "command": "node",
      "args": [
        "/path/to/your/workspace/design-system/packages/naos-mcp/dist/server.js"
      ],
      "env": {
        "GITHUB_TOKEN": "<< Personal access token >>"
      }
    }
  }
}
```

That's it! The naos-mcp should now be ready to help you build with the Naos Design System directly in Claude Desktop.

### Project Setup

When using this MCP server in your project, ensure your `.gitignore` file includes the following entries to prevent committing generated files:

```gitignore
# Cursor AI generated files
.cursor/
```

This prevents the auto-generated cursor rules and other temporary files from being committed to your repository.
