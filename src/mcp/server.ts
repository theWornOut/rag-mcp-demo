import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { calculateInstallments } from './loanMath';
import { retriever } from '../rag';

// Tamamen kurgusal müşteri verisi
const customers: Record<string, { name: string; loanAmount: number; remainingMonths: number; status: string }> = {
  'C-1001': { name: 'Örnek Gıda A.Ş.', loanAmount: 5_000_000, remainingMonths: 20, status: 'Güncel' },
  'C-1002': { name: 'Demo Tekstil Ltd.', loanAmount: 2_500_000, remainingMonths: 8, status: '15 gün gecikmede' },
};

export function createLoanServer(): McpServer {
  const server = new McpServer({ name: 'sme-credit-demo', version: '0.1.0' });

  server.registerTool(
    'calculate_installments',
    {
      title: 'Taksit hesapla',
      description:
        'Eşit taksitli kredi için aylık taksit, toplam geri ödeme ve ödeme planını hesaplar. Oran aylık yüzde olarak verilir.',
      inputSchema: {
        principal: z.number().positive().describe('Kredi tutarı (TL)'),
        months: z.number().int().min(1).max(120).describe('Vade (ay)'),
        monthlyRatePercent: z.number().min(0).max(20).describe('Aylık faiz oranı, yüzde (ör. 3 = %3)'),
      },
    },
    async ({ principal, months, monthlyRatePercent }) => {
      const plan = calculateInstallments(principal, months, monthlyRatePercent);
      // Modelin bağlamını şişirmemek için sadece ilk 3 ve son taksidi döndür
      const preview = [...plan.schedule.slice(0, 3), plan.schedule[plan.schedule.length - 1]];
      const { schedule: _omit, ...summary } = plan;
      return {
        content: [{ type: 'text', text: JSON.stringify({ ...summary, schedulePreview: preview }) }],
      };
    },
  );

  server.registerTool(
    'get_loan_status',
    {
      title: 'Kredi durumu',
      description: 'Müşteri numarasına göre kurgusal kredi durumunu döndürür.',
      inputSchema: {
        customerId: z.string().describe('Müşteri numarası, ör. C-1001'),
      },
    },
    async ({ customerId }) => {
      const c = customers[customerId];
      if (!c) {
        return { isError: true, content: [{ type: 'text', text: `Müşteri bulunamadı: ${customerId}` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify({ customerId, ...c }) }] };
    },
  );

    server.registerTool(
    'search_policy_docs',
    {
      title: 'Politika dokümanlarında ara',
      description:
        'KOBİ kredi ürün şartları, erken kapama, teminat ve başvuru dokümanlarında arama yapar. Cevabı verirken kaynağı (doküman ve bölüm adı) belirt. Sonuç yoksa uydurma, bilgi bulunamadığını söyle.',
      inputSchema: {
        query: z.string().describe('Aranacak soru ya da anahtar kelimeler'),
        topK: z.number().int().min(1).max(5).optional().describe('Kaç parça döndürüleceği (varsayılan 3)'),
      },
    },
    async ({ query, topK }) => {
      const hits = retriever.search(query, topK ?? 3);
      if (hits.length === 0) {
        return { content: [{ type: 'text', text: 'İlgili bölüm bulunamadı.' }] };
      }
      const results = hits.map((h) => ({
        source: h.chunk.docTitle,
        section: h.chunk.heading,
        score: Math.round(h.score * 100) / 100,
        text: h.chunk.text,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(results) }] };
    },
  );

  return server;
}