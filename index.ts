#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

interface ServerConfig {
  gas?: {
    endpoint: string;
    apiKey: string;
  };
}

// 環境変数から設定を読み込む
const config: ServerConfig = {
  gas:
    process.env.GAS_ENDPOINT && process.env.VALID_API_KEY
      ? {
          endpoint: process.env.GAS_ENDPOINT,
          apiKey: process.env.VALID_API_KEY,
        }
      : undefined,
};

// 設定のバリデーション
if (!config.gas?.endpoint || !config.gas?.apiKey) {
  console.error(
    "GAS configuration is missing. Please check your environment variables."
  );
  process.exit(1);
}

// スキーマ定義
const GmailSearchSchema = z.object({
  query: z.string().nonempty("query is required"),
});

const GmailGetMessageSchema = z.object({
  messageId: z.string().nonempty("messageId is required"),
});

const GmailMarkReadSchema = z.object({
  messageId: z.string().nonempty("messageId is required"),
});

const GmailMarkUnreadSchema = z.object({
  messageId: z.string().nonempty("messageId is required"),
});

const GmailDownloadAttachmentSchema = z.object({
  messageId: z.string().nonempty("messageId is required"),
  attachmentId: z.string().nonempty("attachmentId is required"),
});

const GmailMoveToLabelSchema = z.object({
  messageId: z.string().nonempty("messageId is required"),
  labelName: z.string().nonempty("labelName is required"),
});

// MCPサーバーインスタンス作成
const server = new Server(
  {
    name: "mcp-gmail",
    version: "0.0.2",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ListToolsハンドラー
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: "gmail_search_messages",
      description: `
Gmail内で指定したクエリに一致するメールを検索します。
queryパラメータはGmailの検索クエリ形式で指定します。
  例: "subject:Meeting newer_than:1d"

結果はJSONで返り、メール一覧(件名、messageIdなど)を含みます。
`,
      inputSchema: zodToJsonSchema(GmailSearchSchema) as ReturnType<
        typeof zodToJsonSchema
      >,
    },
    {
      name: "gmail_get_message",
      description: `
指定したmessageIdのメール本文と詳細を取得します。
  引数: messageId (GmailのメッセージID)
`,
      inputSchema: zodToJsonSchema(GmailGetMessageSchema) as ReturnType<
        typeof zodToJsonSchema
      >,
    },
    {
      name: "gmail_mark_read",
      description: `
指定したmessageIdのメールを既読にします。
  引数: messageId
`,
      inputSchema: zodToJsonSchema(GmailMarkReadSchema) as ReturnType<
        typeof zodToJsonSchema
      >,
    },
    {
      name: "gmail_mark_unread",
      description: `
指定したmessageIdのメールを未読にします。
  引数: messageId
`,
      inputSchema: zodToJsonSchema(GmailMarkUnreadSchema) as ReturnType<
        typeof zodToJsonSchema
      >,
    },
    {
      name: "gmail_move_to_label",
      description: `
指定したmessageIdのメールを特定のラベルへ移動します。
  引数: messageId, labelName
`,
      inputSchema: zodToJsonSchema(GmailMoveToLabelSchema) as ReturnType<
        typeof zodToJsonSchema
      >,
    },
    {
      name: "gmail_download_attachment",
      description: `
指定したmessageIdとattachmentIdで添付ファイルを取得します。
ファイルはBase64等で返される想定です。
  引数: messageId, attachmentId
`,
      inputSchema: zodToJsonSchema(GmailDownloadAttachmentSchema) as ReturnType<
        typeof zodToJsonSchema
      >,
    },
  ];

  return { tools };
});

// 共通のFetch関数 (GASエンドポイントへアクセス)
async function callGAS(
  action: string,
  params: Record<string, string>
): Promise<any> {
  if (!config.gas) {
    throw new Error("GAS configuration is missing");
  }

  const url = new URL(config.gas.endpoint);
  url.searchParams.set("action", action);
  url.searchParams.set("apiKey", config.gas.apiKey);

  for (const key of Object.keys(params)) {
    url.searchParams.set(key, params[key]);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Tool呼び出しハンドラー
server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "gmail_search_messages": {
          const parsed = GmailSearchSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(
              `Invalid arguments for gmail_search_messages: ${parsed.error}`
            );
          }
          const data = await callGAS("search", { query: parsed.data.query });
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        }

        case "gmail_get_message": {
          const parsed = GmailGetMessageSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(
              `Invalid arguments for gmail_get_message: ${parsed.error}`
            );
          }
          const data = await callGAS("getMessage", {
            messageId: parsed.data.messageId,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        }

        case "gmail_mark_read": {
          const parsed = GmailMarkReadSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(
              `Invalid arguments for gmail_mark_read: ${parsed.error}`
            );
          }
          const data = await callGAS("markRead", {
            messageId: parsed.data.messageId,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        }

        case "gmail_mark_unread": {
          const parsed = GmailMarkUnreadSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(
              `Invalid arguments for gmail_mark_unread: ${parsed.error}`
            );
          }
          const data = await callGAS("markUnread", {
            messageId: parsed.data.messageId,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        }

        case "gmail_move_to_label": {
          const parsed = GmailMoveToLabelSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(
              `Invalid arguments for gmail_move_to_label: ${parsed.error}`
            );
          }
          const data = await callGAS("moveToLabel", {
            messageId: parsed.data.messageId,
            labelName: parsed.data.labelName,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          };
        }

        case "gmail_download_attachment": {
          const parsed = GmailDownloadAttachmentSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(
              `Invalid arguments for gmail_download_attachment: ${parsed.error}`
            );
          }
          const data = await callGAS("downloadAttachment", {
            messageId: parsed.data.messageId,
            attachmentId: parsed.data.attachmentId,
          });

          // 添付ファイルをDownloadsフォルダに保存
          const attachment = data.attachment;
          if (!attachment || !attachment.base64 || !attachment.name) {
            throw new Error("Invalid attachment data from API");
          }

          const downloadsDir = path.join(os.homedir(), "Downloads");
          const filePath = path.join(downloadsDir, attachment.name);
          const fileBuffer = Buffer.from(attachment.base64, "base64");
          fs.writeFileSync(filePath, fileBuffer);

          return {
            content: [
              {
                type: "text",
                text: `添付ファイルを ${filePath} に保存しました。`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// サーバー起動
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Gmail Server running on stdio with API Key auth");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
