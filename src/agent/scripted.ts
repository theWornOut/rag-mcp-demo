import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { callText, type Emit } from './types';

export const SCENARIO_QUESTION =
  '5 milyon TL, 24 ay vadeli KOBİ kredisi kullanmak istiyorum. Aylık %3 faizle taksit ne olur ve erken kapama komisyonu nedir?';

const tl = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

// Model kararları önceden yazılı. MCP ve RAG çağrıları gerçek.
export async function runScenario(client: Client, emit: Emit): Promise<void> {
  emit({ type: 'user', text: SCENARIO_QUESTION });

  const calcArgs = { principal: 5_000_000, months: 24, monthlyRatePercent: 3 };
  emit({ type: 'tool_call', name: 'calculate_installments', args: calcArgs });
  const calcText = await callText(client, 'calculate_installments', calcArgs);
  emit({ type: 'tool_result', name: 'calculate_installments', text: calcText });

  const searchArgs = { query: 'erken kapama komisyonu', topK: 1 };
  emit({ type: 'tool_call', name: 'search_policy_docs', args: searchArgs });
  const searchText = await callText(client, 'search_policy_docs', searchArgs);
  emit({ type: 'tool_result', name: 'search_policy_docs', text: searchText });

  const plan = JSON.parse(calcText) as { monthlyPayment: number; totalPayment: number };
  const hit = (JSON.parse(searchText) as { source: string; section: string; text: string }[])[0];

  emit({
    type: 'answer',
    text:
      `5.000.000 TL, 24 ay, aylık %3 için aylık taksit ${tl(plan.monthlyPayment)} TL, ` +
      `toplam geri ödeme ${tl(plan.totalPayment)} TL olur.\n\n` +
      `Erken kapama: ${hit.text}\n` +
      `Kaynak: ${hit.source} > ${hit.section}`,
  });
}