import { getCurrentDate } from './helper.js';

interface GitHubConfig {
  filePath?: string;
  branch?: string;
}

const createBranchIfNotExists = async (
  token: string,
  branchName: string,
): Promise<void> => {
  try {
    // Check if branch exists
    const checkResponse = await fetch(
      `https://api.github.com/repos/dtsl/lighthouse-automation/branches/${branchName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );

    if (checkResponse.status === 404) {
      // Get main branch SHA
      const mainResponse = await fetch(
        'https://api.github.com/repos/dtsl/lighthouse-automation/branches/main',
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!mainResponse.ok) {
        throw new Error('Failed to get main branch');
      }

      const mainData = await mainResponse.json();
      const mainSha = mainData.commit.sha;

      // Create new branch
      const createResponse = await fetch(
        'https://api.github.com/repos/dtsl/lighthouse-automation/git/refs',
        {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: mainSha,
          }),
        },
      );

      if (!createResponse.ok) {
        throw new Error(`Failed to create branch: ${createResponse.status}`);
      }
    }
  } catch (error) {
    console.log('Error creating branch:', error);
    throw error;
  }
};

const createPullRequestIfNotExists = async (
  token: string,
  branchName: string,
): Promise<void> => {
  try {
    // Check if PR already exists
    const prResponse = await fetch(
      `https://api.github.com/repos/dtsl/lighthouse-automation/pulls?head=dtsl:${branchName}&base=main&state=open`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    );

    if (!prResponse.ok) {
      throw new Error('Failed to check for existing PR');
    }

    const existingPRs = await prResponse.json();

    // If no PR exists, create one
    if (existingPRs.length === 0) {
      const createPRResponse = await fetch(
        'https://api.github.com/repos/dtsl/lighthouse-automation/pulls',
        {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `chore(naos-mcp): UT-0001 | Update logs - ${new Date().toLocaleDateString()}`,
            head: branchName,
            base: 'main',
            body: `Automated analytics logs update from NAOS MCP.\n\nGenerated on: ${new Date().toISOString()}`,
          }),
        },
      );

      if (!createPRResponse.ok) {
        const errorText = await createPRResponse.text();
        throw new Error(
          `Failed to create PR: ${createPRResponse.status} - ${errorText}`,
        );
      }

      console.log('Pull request created successfully');
    } else {
      console.log('Pull request already exists');
    }
  } catch (error) {
    console.log('Error creating pull request:', error);
    throw error;
  }
};

export const pushToGitHub = async ({
  content,
  config,
}: {
  content: string;
  config?: GitHubConfig;
}): Promise<void> => {
  try {
    const {
      filePath = `naos_mcp_logs/db/${getCurrentDate()}/logs.json`,
      branch = 'naos-mcp-logs',
    } = config ?? {};
    const token = process.env.GITHUB_TOKEN;
    if (!token)
      throw new Error('GITHUB_TOKEN environment variable is required');

    // Create branch if it doesn't exist
    await createBranchIfNotExists(token, branch);

    const apiUrl = `https://api.github.com/repos/dtsl/lighthouse-automation/contents/${filePath}`;

    // Fetch current file content and SHA
    let sha: string | undefined;
    let existingContent = '';
    try {
      const getResponse = await fetch(`${apiUrl}?ref=${branch}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
        existingContent = Buffer.from(fileData.content, 'base64').toString(
          'utf-8',
        );
      }
    } catch (error) {
      console.log('File doesnot exist:', error);
    }

    // Clear file if it exceeds 90MB
    const MAX_SIZE = 90 * 1024 * 1024; // 90MB
    if (Buffer.byteLength(existingContent, 'utf-8') > MAX_SIZE) {
      console.log('File too large, clearing contents.');
      existingContent = '';
    }

    // Parse existing content and append new log as JSON array
    let logsArray: any[] = [];

    if (existingContent.trim()) {
      try {
        // Try to parse as JSON array first
        logsArray = JSON.parse(existingContent);
        if (!Array.isArray(logsArray)) {
          // If it's a single object, wrap it in an array
          logsArray = [logsArray];
        }
      } catch (error) {
        console.log(
          'Failed to parse existing content as JSON, treating as single entry',
        );
        // If parsing fails, try to parse as single JSON object
        try {
          const singleEntry = JSON.parse(existingContent);
          logsArray = [singleEntry];
        } catch {
          // If that also fails, start fresh
          logsArray = [];
        }
      }
    }

    // Add new content (parse it if it's a JSON string)
    try {
      const newEntry =
        typeof content === 'string' ? JSON.parse(content) : content;
      logsArray.push(newEntry);
    } catch (error) {
      console.log('Failed to parse new content as JSON, adding as string');
      logsArray.push(content);
    }

    // Convert array back to JSON string
    const newContent = JSON.stringify(logsArray, null, 2);

    // Prepare update payload
    const updateData = {
      message: `chore(naos-mcp): Analytics log update - ${new Date().toISOString()}`,
      content: Buffer.from(newContent).toString('base64'),
      branch,
      ...(sha && { sha }),
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    // Create pull request if it doesn't exist
    await createPullRequestIfNotExists(token, branch);
  } catch (error) {
    console.log('Error pushing to GitHub:', error);
  }
};
