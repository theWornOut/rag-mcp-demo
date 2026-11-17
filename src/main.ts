import './style.css';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { connectInMemory } from './mcp/client';
import { runScenario, runNotFoundScenario } from './agent/scripted';
import type { AgentEvent, Emit } from './agent/types';

type Runner = (client: Client, emit: Emit) => Promise<void>;
type Tag = 'RAG' | 'MCP';
interface ProtoMsg { dir: string; msg: unknown }
interface Step { title: string; event?: AgentEvent; protocol: ProtoMsg[]; tags: Tag[]; narration: string }

const NOT_FOUND = 'İlgili bölüm bulunamadı.';

const TITLES: Record<AgentEvent['type'], string> = {
  user: 'Kullanıcı soru sordu',
  tool_call: 'Model bir araç çağırmaya karar verdi',
  tool_result: 'Araç sonucu döndürdü',
  answer: 'Model cevabı oluşturdu',
};

const FAQ: [string, string, string][] = [
  ['RAG nedir?', 'Modelin bilmediği bilgiyi, senin dokümanlarında arayıp bulması.', 'Ne işe yarar? Model uydurmaz, cevabı kaynağıyla verir.'],
  ['MCP nedir?', 'Yapay zekanın araçlara ve sistemlere ulaşması için ortak bir standart. USB-C gibi.', 'Ne işe yarar? Her sistem için ayrı entegrasyon yazmak yerine bir kez MCP sunucusu yazarsın.'],
  ['Fark ne?', 'RAG: hangi bilgi getirilir. MCP: o bilgiye ya da araca nasıl ulaşılır.', 'Bu demoda RAG, MCP üzerinden sunulan araçlardan biri.'],
];

function narrate(e: AgentEvent | undefined): { tags: Tag[]; text: string } {
  if (!e) {
    return {
      tags: ['MCP'],
      text: 'Uygulama (host) MCP sunucusuna bağlandı ve “hangi araçların var?” diye sordu. Sunucu araçlarını tanıttı: taksit hesaplama, kredi durumu ve doküman arama. Sağdaki sütunda bu konuşmanın gerçek mesajlarını görüyorsun.',
    };
  }
  switch (e.type) {
    case 'user':
      return { tags: [], text: 'Kullanıcı bir soru sordu. Model, cevap için hangi araca ihtiyaç olduğuna karar veriyor.' };
    case 'tool_call':
      if (e.name === 'search_policy_docs') {
        return {
          tags: ['RAG', 'MCP'],
          text: 'Model “search_policy_docs” aracını çağırıyor. Bu araç RAG’ın kendisi: doküman parçaları arasında arama yapacak. Çağrı MCP üzerinden sunucuya gidiyor.',
        };
      }
      return {
        tags: ['MCP'],
        text: `Model “${e.name}” aracını çağırıyor. Çağrı MCP üzerinden sunucuya gidiyor; sağ sütunda tools/call mesajını görebilirsin. Bu bir hesaplama aracı, RAG değil.`,
      };
    case 'tool_result':
      if (e.name === 'search_policy_docs') {
        if (e.text === NOT_FOUND) {
          return {
            tags: ['RAG'],
            text: 'RAG ilgili bir bölüm bulamadı. Doküman var ama anahtar kelime araması “vadeden önce” ile “erken kapama”yı eşleştiremedi. Çözüm: anlam tabanlı arama (embedding).',
          };
        }
        return {
          tags: ['RAG', 'MCP'],
          text: 'RAG, doküman parçaları arasından en ilgili bölümü buldu ve MCP üzerinden modele geri getirdi.',
        };
      }
      return { tags: ['MCP'], text: 'MCP sunucusu hesabı yaptı ve sonucu modele geri gönderdi.' };
    case 'answer':
      if (e.text.includes('bulamadım')) {
        return { tags: ['RAG'], text: 'RAG’dan sonuç gelmediği için model cevabı uydurmadı, bulamadığını söyledi. İyi bir RAG sisteminin doğru davranışı bu.' };
      }
      return { tags: ['RAG', 'MCP'], text: 'Model, hesap sonucunu ve bulunan doküman parçasını birleştirip kaynağıyla cevapladı. RAG bilgiyi buldu, MCP onu taşıdı.' };
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const badge = (t: Tag) => el('span', `badge ${t.toLowerCase()}`, t);

const pretty = (s: string) => {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
};

async function buildSteps(runner: Runner): Promise<Step[]> {
  const steps: Step[] = [];
  let buffer: ProtoMsg[] = [];
  const flush = () => { const b = buffer; buffer = []; return b; };

  const { client } = await connectInMemory((dir, msg) => buffer.push({ dir, msg }));
  await client.listTools();
  const first = narrate(undefined);
  steps.push({ title: 'Host, MCP sunucusuna bağlandı ve araç listesini istedi', protocol: flush(), tags: first.tags, narration: first.text });

  await runner(client, (event) => {
    const n = narrate(event);
    steps.push({ title: TITLES[event.type], event, protocol: flush(), tags: n.tags, narration: n.text });
  });
  return steps;
}

function column(title: string, sub: string) {
  const s = el('section');
  s.append(el('h2', undefined, title), el('p', 'sub', sub));
  const body = el('div');
  s.append(body);
  return { section: s, body };
}

function cardTitle(text: string, tags: Tag[]) {
  const t = el('div', 't');
  for (const tag of tags) t.append(badge(tag));
  t.append(document.createTextNode(text));
  return t;
}

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app')!;

  const header = el('header');
  header.append(
    el('h1', undefined, 'RAG + MCP: KOBİ Kredi Asistanı'),
    el('p', undefined, 'Senaryo modu: model kararları önceden yazılı. MCP sunucusu ve RAG araması gerçek çalışır. Tüm veriler kurgusaldır.'),
  );

  const faq = el('div', 'faq');
  for (const [q, a, b] of FAQ) {
    const item = el('div', 'item');
    item.append(el('h3', undefined, q), el('p', undefined, a), el('p', undefined, b));
    faq.append(item);
  }

  const scenarios = el('div', 'scenarios');
  const s1 = el('button', 'secondary', 'Senaryo 1: RAG cevabı buldu');
  const s2 = el('button', 'secondary', 'Senaryo 2: RAG bulamadı');
  scenarios.append(s1, s2);

  const nextBtn = el('button', undefined, 'Sonraki ▶');
  const autoBtn = el('button', 'secondary', 'Otomatik oynat');
  const resetBtn = el('button', 'secondary', 'Baştan');
  const caption = el('span', 'caption');
  const controls = el('div', 'controls');
  controls.append(nextBtn, autoBtn, resetBtn, caption);

  const narration = el('div', 'narration');

  const chat = column('Konuşma', 'Kullanıcı ve model');
  const tools = column('MCP araç çağrıları', 'Modelin kullandığı araçlar');
  const proto = column('MCP protokolü (JSON-RPC)', 'İstemci ile sunucu arasındaki gerçek mesajlar');
  const grid = el('main');
  grid.append(chat.section, tools.section, proto.section);

  app.append(header, faq, scenarios, controls, narration, grid);

  let steps: Step[] = [];
  let idx = 0;
  let timer: number | undefined;

  const stop = () => {
    if (timer) { clearInterval(timer); timer = undefined; }
    autoBtn.textContent = 'Otomatik oynat';
  };

  const clearAll = () => {
    stop();
    idx = 0;
    chat.body.replaceChildren();
    tools.body.replaceChildren();
    proto.body.replaceChildren();
    narration.replaceChildren(document.createTextNode('Başlamak için “Sonraki”ye bas.'));
    caption.textContent = '';
  };

  const show = (s: Step, i: number) => {
    caption.textContent = `Adım ${i + 1}/${steps.length}: ${s.title}`;
    narration.replaceChildren(...s.tags.map(badge), document.createTextNode(s.narration));

    const e = s.event;
    if (e?.type === 'user') chat.body.append(el('div', 'bubble user', e.text));
    if (e?.type === 'answer') chat.body.append(el('div', 'bubble answer', e.text));
    if (e?.type === 'tool_call') {
      const c = el('div', 'card');
      const tags: Tag[] = e.name === 'search_policy_docs' ? ['RAG', 'MCP'] : ['MCP'];
      c.append(cardTitle(`çağrı: ${e.name}`, tags), el('pre', undefined, JSON.stringify(e.args, null, 2)));
      tools.body.append(c);
    }
    if (e?.type === 'tool_result') {
      const c = el('div', 'card');
      const tags: Tag[] = e.name === 'search_policy_docs' ? ['RAG', 'MCP'] : ['MCP'];
      c.append(cardTitle(`sonuç: ${e.name}`, tags), el('pre', undefined, pretty(e.text)));
      tools.body.append(c);
    }
    for (const p of s.protocol) {
      const m = p.msg as { method?: string; id?: number };
      const label = m.method ?? `yanıt (id ${m.id})`;
      const d = el('details', p.dir.startsWith('client') ? 'c2s' : 's2c');
      d.append(el('summary', undefined, `${p.dir}: ${label}`), el('pre', undefined, JSON.stringify(p.msg, null, 2)));
      proto.body.append(d);
    }
    tools.body.lastElementChild?.scrollIntoView({ block: 'nearest' });
    proto.body.lastElementChild?.scrollIntoView({ block: 'nearest' });
  };

  const next = () => {
    if (idx >= steps.length) { stop(); return; }
    show(steps[idx], idx);
    idx++;
    if (idx >= steps.length) { nextBtn.disabled = true; stop(); }
  };

  const load = async (runner: Runner, active: HTMLButtonElement) => {
    clearAll();
    nextBtn.disabled = autoBtn.disabled = true;
    s1.classList.toggle('active', active === s1);
    s2.classList.toggle('active', active === s2);
    caption.textContent = 'Hazırlanıyor…';
    steps = await buildSteps(runner);
    caption.textContent = '';
    nextBtn.disabled = autoBtn.disabled = false;
  };

  nextBtn.onclick = next;
  autoBtn.onclick = () => {
    if (timer) { stop(); return; }
    autoBtn.textContent = 'Durdur';
    next();
    timer = window.setInterval(next, 2600);
  };
  let current: { runner: Runner; btn: HTMLButtonElement } = { runner: runScenario, btn: s1 };
  resetBtn.onclick = () => { void load(current.runner, current.btn); };
  s1.onclick = () => { current = { runner: runScenario, btn: s1 }; void load(runScenario, s1); };
  s2.onclick = () => { current = { runner: runNotFoundScenario, btn: s2 }; void load(runNotFoundScenario, s2); };
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight' || ev.key === ' ') {
      ev.preventDefault();
      if (!nextBtn.disabled) next();
    }
  });

  await load(runScenario, s1);
}

main();