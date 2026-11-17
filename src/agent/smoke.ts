import { connectInMemory } from '../mcp/client';
import { runScenario } from './scripted';

const { client } = await connectInMemory(() => {});
await runScenario(client, (e) => console.log(`\n[${e.type}]`, e));
process.exit(0);