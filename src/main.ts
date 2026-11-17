import './style.css';
import { connectInMemory } from './mcp/client';
import { runScenario } from './agent/scripted';
import type { AgentEvent } from './agent/types';

interface ProtoMsg { dir: string; msg: unknown }
interface Step { title: string; event?: AgentEvent; protocol: ProtoMsg[] }

const TITLES: Record<AgentEvent['type'], string> = {
  user: 'Kullanıcı soru sordu',
  tool_call: 'Model bir tool çağırmaya karar verdi',
  tool_result: 'MCP sunucusu sonucu döndürdü',
  answer: 'Model, sonuçlarla cevabı oluşturdu',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const pretty = (s: string) => {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
};

async function buildSteps(): Promise<Step[]> {
  const steps: Step[] = [];
  let buffer: ProtoMsg[] = [];
  const flush = () => { const b = buffer; buffer = []; return b; };

  const { client } = await connectInMemory((dir, msg) => buffer.push({ dir, msg }));
  await client.listTools();
  steps.push({ title: 'Host, MCP sunucusuna bağlandı ve tool listesini istedi', protocol: flush() });

  await runScenario(client, (event) => steps.push({ title: TITLES[event.type], event, protocol: flush() }));
  return steps;
}

function column(title: string, sub: string) {
  const s = el('section');
  s.append(el('h2', undefined, title), el('p', 'sub', sub));
  const body = el('div');
  s.append(body);
  return { section: s, body };
}

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app')!;

  const header = el('header');
  header.append(
    el('h1', undefined, 'RAG + MCP: KOBİ Kredi Asistanı'),
    el('p', undefined, 'Senaryo modu: model kararları önceden yazılı. MCP sunucusu ve RAG araması gerçek çalışır. Tüm veriler kurgusaldır.'),
  );

  const nextBtn = el('button', undefined, 'Sonraki ▶');
  const autoBtn = el('button', 'secondary', 'Otomatik oynat');
  const resetBtn = el('button', 'secondary', 'Baştan');
  const caption = el('span', 'caption');
  const controls = el('div', 'controls');
  controls.append(nextBtn, autoBtn, resetBtn, caption);

  const chat = column('Konuşma', 'Kullanıcı ve model');
  const tools = column('MCP tool çağrıları', 'Modelin kullandığı araçlar');
  const proto = column('Protokol (JSON-RPC)', 'İstemci ile sunucu arasındaki gerçek mesajlar');
  const main = el('main');
  main.append(chat.section, tools.section, proto.section);

  app.append(header, controls, main);
  caption.textContent = 'Hazırlanıyor…';
  nextBtn.disabled = autoBtn.disabled = true;

  const steps = await buildSteps();
  let idx = 0;
  let timer: number | undefined;

  const show = (s: Step, i: number) => {
    caption.textContent = `Adım ${i + 1}/${steps.length}: ${s.title}`;
    const e = s.event;
    if (e?.type === 'user') chat.body.append(el('div', 'bubble user', e.text));
    if (e?.type === 'answer') chat.body.append(el('div', 'bubble answer', e.text));
    if (e?.type === 'tool_call') {
      const c = el('div', 'card');
      c.append(el('div', 't', `→ çağrı: ${e.name}`), el('pre', undefined, JSON.stringify(e.args, null, 2)));
      tools.body.append(c);
    }
    if (e?.type === 'tool_result') {
      const c = el('div', 'card');
      c.append(el('div', 't', `← sonuç: ${e.name}`), el('pre', undefined, pretty(e.text)));
      tools.body.append(c);
    }
    for (const p of s.protocol) {
      const m = p.msg as { method?: string; id?: number };
      const label = m.method ?? `yanıt (id ${m.id})`;
      const d = el('details', p.dir.startsWith('client') ? 'c2s' : 's2c');
      d.append(el('summary', undefined, `${p.dir}: ${label}`), el('pre', undefined, JSON.stringify(p.msg, null, 2)));
      proto.body.append(d);
    }
    main.lastElementChild?.lastElementChild?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  };

  const stop = () => { if (timer) { clearInterval(timer); timer = undefined; } autoBtn.textContent = 'Otomatik oynat'; };
  const next = () => {
    if (idx >= steps.length) { stop(); return; }
    show(steps[idx], idx);
    idx++;
    if (idx >= steps.length) { nextBtn.disabled = true; stop(); }
  };

  nextBtn.onclick = next;
  autoBtn.onclick = () => {
    if (timer) { stop(); return; }
    autoBtn.textContent = 'Durdur';
    next();
    timer = window.setInterval(next, 2200);
  };
  resetBtn.onclick = () => {
    stop(); idx = 0;
    chat.body.replaceChildren(); tools.body.replaceChildren(); proto.body.replaceChildren();
    caption.textContent = 'Başlamak için “Sonraki”ye bas';
    nextBtn.disabled = false;
  };
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight' || ev.key === ' ') { ev.preventDefault(); if (!nextBtn.disabled) next(); }
  });

  caption.textContent = 'Başlamak için “Sonraki”ye bas';
  nextBtn.disabled = autoBtn.disabled = false;
}

main();