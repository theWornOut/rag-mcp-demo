import type { Doc } from './corpus';

export interface Chunk {
  id: string;
  docTitle: string;
  heading: string;
  text: string;
}

// Dokümanı "## " başlıklarına göre parçalara böler. Her parça bir konu içerir.
export function chunkDocument(doc: Doc): Chunk[] {
  return doc.text
    .split(/^## /m)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((section, i) => {
      const [heading, ...body] = section.split('\n');
      return {
        id: `${doc.id}#${i + 1}`,
        docTitle: doc.title,
        heading: heading.trim(),
        text: body.join(' ').trim(),
      };
    });
}

const fold = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');

const STOP = new Set(['ve', 'ile', 'bir', 'bu', 'icin', 'mi', 'ne', 'de', 'da']);

// Türkçe ekli bir dil. Basit çözüm: kelimenin ilk 5 harfini kök say.
function tokenize(s: string): string[] {
  return fold(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => t.slice(0, 5));
}

export interface SearchHit {
  chunk: Chunk;
  score: number;
}

// BM25: kelime sıklığı, nadir kelimeye ağırlık, uzun metni hafif cezalandırma
// sonra:
export class Bm25Index {
  private chunks: Chunk[];
  private tf: Map<string, number>[] = [];
  private len: number[] = [];
  private df = new Map<string, number>();
  private avgLen = 0;
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  constructor(chunks: Chunk[]) {
    this.chunks = chunks;
    for (const c of chunks) {
      const tokens = tokenize(`${c.heading} ${c.text}`);
      const counts = new Map<string, number>();
      for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
      this.tf.push(counts);
      this.len.push(tokens.length);
      for (const t of counts.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    this.avgLen = this.len.reduce((a, b) => a + b, 0) / (this.len.length || 1);
  }

  search(query: string, topK = 3): SearchHit[] {
    const qTokens = tokenize(query);
    const n = this.chunks.length;
    const hits: SearchHit[] = [];
    for (let i = 0; i < n; i++) {
      let score = 0;
      for (const t of qTokens) {
        const f = this.tf[i].get(t) ?? 0;
        if (!f) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        const norm = f + this.k1 * (1 - this.b + (this.b * this.len[i]) / this.avgLen);
        score += idf * ((f * (this.k1 + 1)) / norm);
      }
      if (score > 0) hits.push({ chunk: this.chunks[i], score });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}