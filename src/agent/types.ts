import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export type AgentEvent =
  | { type: 'user'; text: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; text: string }
  | { type: 'answer'; text: string };

export type Emit = (event: AgentEvent) => void;

// MCP tool sonucundan metin kısmını çıkarır
export async function callText(client: Client, name: string, args: Record<string, unknown>): Promise<string> {
  const result = await client.callTool({ name, arguments: args });
  const content = (result as { content?: { type: string; text?: string }[] }).content ?? [];
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n');
}