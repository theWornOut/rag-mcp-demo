import { connectInMemory } from './client';

const { client } = await connectInMemory((dir, msg) => {
  console.log(`\n[${dir}]`, JSON.stringify(msg));
});

const tools = await client.listTools();
console.log('\nTOOLS:', tools.tools.map((t) => t.name));

const result = await client.callTool({
  name: 'calculate_installments',
  arguments: { principal: 10_000_000, months: 36, monthlyRatePercent: 3 },
});
console.log('\nRESULT:', JSON.stringify(result));
process.exit(0);