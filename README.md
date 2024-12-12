# MCP Gmail

Model Context Protocol server for Gmail integration. This allows Claude Desktop (or any MCP client) to interact with your Gmail account through Google Apps Script.

## Quick Start (For Users)

### Prerequisites
- Node.js 18+ (install via `brew install node`)
- Gmail account
- Google Apps Script deployment
- Claude Desktop (install from https://claude.ai/desktop)

### Configuration

1. Deploy the Google Apps Script
- Visit [Google Apps Script](https://script.google.com/) and create a new project
- Copy the entire contents of `code.gs` and paste it into the script editor
- Click on "Deploy" > "New deployment"
- Select "Web app" as the deployment type
- Configure the following settings:
  - Execute as: Me
  - Who has access: Anyone
  - Click "Deploy"
- When prompted, review and authorize the app to access your Gmail account
- Copy the deployment URL and generate a random API key for security

Note: The script requires Gmail access permissions. When you first deploy and run the script, Google will ask you to review and grant these permissions. Make sure to:
1. Click "Review Permissions"
2. Select your Google account
3. Click "Advanced" if you see a warning
4. Click "Go to [Your Project Name] (unsafe)"
5. Click "Allow" to grant the necessary Gmail permissions

2. Open your Claude Desktop configuration file at:
`~/Library/Application Support/Claude/claude_desktop_config.json`

You can find this through the Claude Desktop menu:
1. Open Claude Desktop
2. Click Claude on the Mac menu bar
3. Click "Settings"
4. Click "Developer"

3. Add the following to your configuration:

```json
{
  "tools": {
    "gmail": {
      "command": "npx",
      "args": ["-y", "@kazuph/mcp-gmail-gas"],
      "env": {
        "GAS_ENDPOINT": "YOUR_DEPLOYMENT_URL",
        "VALID_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

Note: Replace `YOUR_DEPLOYMENT_URL` and `YOUR_API_KEY` with your actual values.

## For Developers

### Prerequisites
- Node.js 18+ (install via `brew install node`)
- Gmail account
- Google Apps Script
- Claude Desktop (install from https://claude.ai/desktop)
- tsx (install via `npm install -g tsx`)

### Installation

```bash
git clone https://github.com/kazuph/mcp-gmail-gas.git
cd mcp-gmail-gas
npm install
npm run build
```

### Development Configuration

1. Make sure Claude Desktop is installed and running.

2. Install tsx globally if you haven't:
```bash
npm install -g tsx
# or
pnpm add -g tsx
```

3. Modify your Claude Desktop config located at:
`~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following to your MCP client's configuration:

```json
{
  "tools": {
    "gmail": {
      "args": ["tsx", "/path/to/mcp-gmail-gas/index.ts"],
      "env": {
        "GAS_ENDPOINT": "YOUR_DEPLOYMENT_URL",
        "VALID_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Available Tools

- `gmail_search_messages`: Search for emails using Gmail search query syntax (e.g., "subject:Meeting newer_than:1d")
- `gmail_get_message`: Get the full content and details of a specific email
- `gmail_mark_read`: Mark a specific email as read
- `gmail_mark_unread`: Mark a specific email as unread
- `gmail_move_to_label`: Move a specific email to a Gmail label
- `gmail_download_attachment`: Download an attachment from a specific email

## Security Note

Always keep your `VALID_API_KEY` secret and never commit it to version control. This key helps ensure that only authorized clients can access your Gmail through the Google Apps Script deployment.
