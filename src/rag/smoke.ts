import { retriever } from './index';
import { connectInMemory } from '../mcp/client';

for (const q of ['erken kapama komisyonu ne kadar', 'hangi belgeler lazım', 'vadeden önce kapatırsam ne olur']) {
  console.log(`\nSORU: ${q}`);
  for (const h of retriever.search(q, 2)) {
    console.log(`  ${h.score.toFixed(2)}  ${h.chunk.docTitle} > ${h.chunk.heading}`);
  }
}

// Aynı aramayı MCP tool'u üzerinden de çağır
const { client } = await connectInMemory(() => {});
const tools = await client.listTools();
console.log('\nTOOLS:', tools.tools.map((t) => t.name));
const r = await client.callTool({ name: 'search_policy_docs', arguments: { query: 'teminat KGF' } });
console.log('MCP SONUCU:', JSON.stringify(r));
process.exit(0);