#!/usr/bin/env node
/*
 * Build data/tools.json from README.md so the site and the list never drift.
 * Usage: node scripts/build-data.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const OUT = path.join(ROOT, 'data', 'tools.json');
const REPO_URL = 'https://github.com/mdruhulkuddus/awesome-free-ai-tools';

// Stable ids keep existing #filter= links working. New headings fall back to a slug.
const CATEGORY_IDS = {
  'Other chatbots & assistants': 'other-chatbots',
  'AI browsers & browser agents': 'ai-browsers',
  'AI research & search': 'research-search',
  'Writing, editing & paraphrasing': 'writing',
  'Document & PDF AI': 'document-pdf',
  'OCR & document extraction': 'ocr-extraction',
  'Productivity, notes & knowledge management': 'productivity',
  'Meeting notes & transcription': 'meetings',
  'Translation & speech-to-text': 'translation-stt',
  'Presentations & design': 'presentations',
  'Data & spreadsheets': 'data-spreadsheets',
  'Image generation': 'image-generation',
  'Image editing & enhancement': 'image-editing',
  'Video generation': 'video-generation',
  'Video editing with AI': 'video-editing',
  'Audio, music & voice': 'audio-music',
  'Audio stem separation': 'stem-separation',
  'Avatars & talking heads': 'avatars',
  '3D model generation': '3d-generation',
  'AI coding assistants': 'coding-assistants',
  'AI app builders (vibe coding)': 'app-builders',
  'Code review AI': 'code-review',
  'AI-powered dev tools': 'dev-tools',
  'Developer APIs with free tiers': 'developer-apis',
  'Local & open-source LLM runners': 'local-llm-runners',
  'Notable open-weight models': 'open-weight-models',
  'RAG frameworks': 'rag-frameworks',
  'Vector databases & embeddings': 'vector-databases',
  'MCP servers & tooling': 'mcp-tooling',
  'AI observability & evals': 'observability-evals',
  'Workflow automation & no-code AI': 'workflow-automation',
  'AI agents & autonomous workflows': 'agents',
  'Computer-use agents': 'computer-use',
  'Voice agents & on-device AI': 'voice-on-device',
  'AI detection & humanizers': 'detection',
  'Resume & career AI': 'resume-career',
  'Study & education AI': 'study-education',
  'Math & STEM solvers': 'math-stem',
  'Marketing & SEO AI': 'marketing-seo',
  'Website builders with AI': 'website-builders',
  'AI companions & roleplay': 'companions',
  'Prompt libraries': 'prompt-libraries',
  'Finance AI': 'finance',
  'Medical & clinical AI': 'medical',
  'Email AI': 'email',
};

// Used when a README section has no intro paragraph of its own.
const FALLBACK_DESCRIPTIONS = {
  'other-chatbots': 'Every one of these has a meaningful free experience — several are frontier-class.',
  'research-search': 'Citation-backed search and literature exploration tools.',
  'writing': 'Grammar checkers, paraphrasers, and copywriting assistants with usable free tiers.',
  'document-pdf': 'Chat with PDFs, extract, and summarize long documents.',
  'productivity': 'Note-taking and PKM tools with real free tiers, many open-source.',
  'meetings': 'Meeting AIs — from unlimited transcripts to bot-free local capture.',
  'translation-stt': 'Translators and transcription tools that work on a free tier.',
  'presentations': 'Prompt-to-deck tools and AI-assisted design editors.',
  'data-spreadsheets': 'AI for spreadsheets, CSVs, and data exploration.',
  'image-generation': 'Text-to-image models with real free usage — from Nano Banana to open-weight Flux.',
  'image-editing': 'Upscalers, background removers, and AI-powered editors.',
  'video-generation': 'Text/image-to-video with usable free tiers (and open weights).',
  'video-editing': 'Full editors with AI features — captions, cuts, voice, avatars.',
  'audio-music': 'Song generation, TTS, voice cloning, and music production AI.',
  'avatars': 'AI avatar video generators — from studio-grade HeyGen to open-source SadTalker.',
  '3d-generation': 'Text/image-to-3D with free credits and open-source Hunyuan/TRELLIS.',
  'coding-assistants': 'IDE copilots and coding agents with real free tiers — from Devin Desktop to open-source Cline.',
  'app-builders': 'Prompt-to-app builders that generate and deploy full-stack projects.',
  'code-review': 'Automated PR review and test-gen tools.',
  'dev-tools': 'Terminals, launchers, editors, and agent frameworks with AI built in.',
  'local-llm-runners': 'Run models entirely on your own hardware with real free software.',
  'rag-frameworks': 'Open-source frameworks for retrieval-augmented generation over your own data.',
  'vector-databases': 'Vector stores for embeddings — from a Postgres extension to billion-scale databases.',
  'observability-evals': 'Trace, evaluate and red-team LLM apps — all open source.',
  'agents': 'Autonomous agent platforms — most open-source with BYOK.',
  'voice-on-device': 'Real-time voice agent frameworks and fully on-device models.',
  'detection': 'AI-text detectors and humanizers — useful signal but not proof.',
  'resume-career': 'Resume builders and job-tracking tools with free tiers.',
  'study-education': 'Tutors, flashcards, and homework helpers — free for students.',
  'math-stem': 'Step-by-step math solvers and computational engines.',
  'marketing-seo': 'GEO / SEO tools and marketing copy with real free tiers.',
  'website-builders': 'AI site generators with real free publishing options.',
  'prompt-libraries': 'Browse and remix community prompts.',
  'finance': 'Investing and market-research assistants — a thin free-tier space.',
  'medical': 'Clinical AI tools — most require verified credentials.',
  'email': 'Gmail / Outlook-layered AI with usable free features.',
};

// README sections that are not tool categories.
const SKIP_SECTIONS = /^(📖 Introduction|Table of contents|Contributing|🔥 Trending|🌟 Top AI chatbots|⚠️ Removed|🆕 New)/;

/* ---- Markdown helpers ------------------------------------------- */
const stripMd = (s) => s
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/(^|[^*\w])\*([^*]+)\*(?!\w)/g, '$1$2')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

const stripWarn = (s) => s.replace(/^⚠️\s*/, '');
// "light blogging" -> "Light blogging", but leave "iOS" / "macOS" alone.
const capitalize = (s) => (/^[a-z](?![A-Z])/.test(s) ? s[0].toUpperCase() + s.slice(1) : s);
const firstLink = (s) => /\[([^\]]+)\]\(([^)]+)\)/.exec(s);
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tableCells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
const isTableDivider = (line) => /^\|[\s:|-]+\|$/.test(line.trim());

function sentences(text, max) {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z"“])/);
  let out = '';
  for (const p of parts.slice(0, max)) {
    if (out && (out + ' ' + p).length > 300) break;
    out = out ? out + ' ' + p : p;
  }
  return out;
}

function splitSections(md, level) {
  const marker = '#'.repeat(level) + ' ';
  const sections = [];
  let current = null;
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith(marker)) {
      current = { title: line.slice(marker.length).trim(), lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections;
}

function parseTable(lines) {
  const rows = lines.filter(l => l.trim().startsWith('|') && !isTableDivider(l)).map(tableCells);
  if (!rows.length) return null;
  return { headers: rows[0].map(stripMd), rows: rows.slice(1) };
}

/* ---- Tool entries ----------------------------------------------- */
// "- **[Name](url)** — Description. | Free: … | Best for: … | Catch: …"
function parseToolBullet(line) {
  const m = /^- \*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*[—-]\s*(.*)$/.exec(line.trim());
  if (!m) return null;
  const [, name, url, rest] = m;
  return { name: stripMd(name), url, ...parseFields(rest) };
}

// "Description | Free: … | Best for: … | Catch: …" -> { description, free, bestFor, catch }
function parseFields(text) {
  const out = {};
  text.split(/\s+\|\s+/).forEach((part, i) => {
    const field = /^(Free|Best for|Catch):\s*(.*)$/i.exec(part.trim());
    if (field) {
      const key = { free: 'free', 'best for': 'bestFor', catch: 'catch' }[field[1].toLowerCase()];
      out[key] = capitalize(stripMd(field[2]));
    } else if (i === 0) {
      out.description = stripMd(part);
    }
  });
  return out;
}

// Table-based categories (developer APIs, open-weight models).
function toolsFromTable(table) {
  const h = table.headers.map(x => x.toLowerCase());
  const col = (re) => h.findIndex(x => re.test(x));
  return table.rows.map(cells => {
    const link = firstLink(cells[0]);
    if (!link) return null;
    const get = (i) => (i >= 0 && cells[i] ? stripMd(cells[i]) : '');
    const tool = { name: stripMd(link[1]), url: link[2] };

    const freeTier = get(col(/^free tier/));
    if (freeTier) {
      const card = get(col(/^card/));
      const trains = get(col(/^trains/));
      tool.description = freeTier;
      tool.free = card && /^no/i.test(card) ? `No card required${card.includes('phone') ? ' (phone verification)' : ''}` : `Card: ${card}`;
      if (trains) tool.catch = `Trains on your data: ${trains}`;
      return tool;
    }

    const maker = get(col(/^maker/));
    const licence = get(col(/^licen[cs]e/));
    const why = get(col(/^why/));
    tool.description = why;
    if (licence) tool.free = `Free weights — ${licence} licence`;
    if (maker) tool.bestFor = `Self-hosting ${maker} models`;
    return tool;
  }).filter(Boolean);
}

function parseCategory(section) {
  const intro = [];
  const notes = [];
  const tools = [];
  const tableLines = [];
  let seenContent = false;

  for (const raw of section.lines) {
    const line = raw.trim();
    if (!line || line === '---') continue;
    if (line.startsWith('|')) { tableLines.push(line); seenContent = true; continue; }
    if (line.startsWith('- ')) {
      seenContent = true;
      const tool = parseToolBullet(line);
      if (tool) tools.push(tool);
      else notes.push(stripWarn(stripMd(line.slice(2))));
      continue;
    }
    if (line.startsWith('>')) { notes.push(stripWarn(stripMd(line.replace(/^>\s*/, '')))); continue; }
    if (!seenContent) intro.push(stripMd(line));
    else notes.push(stripWarn(stripMd(line)));
  }

  const table = parseTable(tableLines);
  if (table) tools.push(...toolsFromTable(table));

  const name = section.title.replace(/\s*🆕$/, '');
  const id = CATEGORY_IDS[name] || slugify(name);
  const category = {
    id,
    name,
    description: intro.join(' ') || FALLBACK_DESCRIPTIONS[id] || '',
    tools,
  };
  if (notes.length) category.notes = notes;
  return category;
}

/* ---- Top chatbots ----------------------------------------------- */
function parseChatbot(title, lines) {
  const m = /^(.*?)(?:\s*\(([^)]+)\))?$/.exec(title);
  const bot = { name: m[1].trim(), provider: m[2] || '', fields: {}, extras: [] };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('- ')) continue;
    const f = /^- \*\*([^*]+?):\*\*\s*(.*)$/.exec(line);
    if (f) bot.fields[f[1].toLowerCase()] = f[2];
    else bot.extras.push(stripMd(line.slice(2)));
  }
  const link = firstLink(bot.fields.link || '');
  bot.url = link ? link[2] : '';
  return bot;
}

function parseTopChatbots(section) {
  const top3 = [];
  const alternatives = [];
  let comparisonTable = null;

  for (const sub of splitSections(section.lines.join('\n'), 3)) {
    const isTop = /Top 3/i.test(sub.title);
    for (const bot of splitSections(sub.lines.join('\n'), 4)) {
      if (/side-by-side/i.test(bot.title)) {
        const t = parseTable(bot.lines);
        if (t) {
          const yesNo = (c) => stripMd(c).replace(/^✅\s*/, 'Yes ').replace(/^❌\s*/, 'No ').trim();
          comparisonTable = {
            headers: t.headers.map((h, i) => (i === 0 && !h ? 'Feature' : h)),
            rows: t.rows.map(r => r.map(yesNo)),
          };
        }
        continue;
      }
      const b = parseChatbot(bot.title, bot.lines);
      const f = b.fields;
      const free = stripMd(f['free tier'] || '');
      const lose = stripMd(f['lose vs paid'] || '');
      const caught = stripMd(f.catch || '');
      const unique = stripMd(f['unique feature'] || '');
      const entry = {
        name: b.name,
        provider: b.provider,
        url: b.url,
        bestAt: stripMd(f['best at'] || ''),
      };
      if (isTop) {
        entry.bullets = [
          ...free.split(/(?<=\.)\s+(?=[A-Z])/),
          lose && `Paid unlocks: ${lose}`,
          caught && `Catch: ${caught}`,
          ...b.extras,
        ].filter(Boolean);
        entry.uniqueFeature = unique;
        top3.push(entry);
      } else {
        entry.free = free;
        entry.catch = caught;
        entry.uniqueFeature = unique;
        alternatives.push(entry);
      }
      // "At a glance: Free: … | Best for: … | Catch: …" gives the short card text;
      // otherwise fall back to the opening sentences of the long fields.
      const glance = f['at a glance'] ? parseFields(f['at a glance']) : {};
      entry._card = {
        name: b.name,
        url: b.url,
        description: entry.bestAt,
        free: glance.free || sentences(free, 2),
        bestFor: glance.bestFor,
        catch: glance.catch || sentences(caught || lose, 2),
      };
      if (!entry._card.bestFor) delete entry._card.bestFor;
    }
  }

  const chatbotsCategory = {
    id: 'top-ai-chatbots',
    name: 'Top AI chatbots',
    description: stripMd(section.lines.find(l => l.trim() && !l.startsWith('#')) || ''),
    tools: [...top3, ...alternatives].map(e => {
      const card = e._card;
      delete e._card;
      return card;
    }),
  };

  return { top3, alternatives, comparisonTable, chatbotsCategory };
}

/* ---- Trending / removed ----------------------------------------- */
function parseTrending(section) {
  const t = parseTable(section.lines);
  const intro = section.lines.find(l => l.trim() && !l.startsWith('|') && !l.startsWith('>'));
  const note = section.lines.find(l => l.startsWith('>'));
  return {
    title: section.title.replace(/^🔥\s*/, ''),
    description: intro ? stripMd(intro) : '',
    note: note ? stripWarn(stripMd(note.replace(/^>\s*/, ''))) : '',
    items: t ? t.rows.map(([tool, why, free]) => {
      const link = firstLink(tool);
      return { name: stripMd(link ? link[1] : tool), url: link ? link[2] : '', why: stripMd(why), free: stripMd(free) };
    }) : [],
  };
}

function parseRemoved(section) {
  const t = parseTable(section.lines);
  const intro = section.lines.find(l => l.trim() && !l.startsWith('|'));
  return {
    title: section.title.replace(/^⚠️\s*/, ''),
    description: intro ? stripMd(intro) : '',
    items: t ? t.rows.map(([tool, what, date]) => ({ name: stripMd(tool), what: stripMd(what), date: stripMd(date) })) : [],
  };
}

/* ---- Main ------------------------------------------------------- */
function build() {
  const md = fs.readFileSync(README, 'utf8');
  const sections = splitSections(md, 2);

  const updated = /Last updated:\s*([A-Za-z]+ \d{1,2}, \d{4})/.exec(md);
  const lastUpdated = updated ? new Date(updated[1] + ' UTC').toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const top = sections.find(s => /Top AI chatbots/.test(s.title));
  const { top3, alternatives, comparisonTable, chatbotsCategory } = parseTopChatbots(top);
  const trendingSection = sections.find(s => /^🔥/.test(s.title));
  const removedSection = sections.find(s => /^⚠️ Removed/.test(s.title));

  const categories = [chatbotsCategory, ...sections
    .filter(s => !SKIP_SECTIONS.test(s.title))
    .map(parseCategory)
    .filter(c => c.tools.length > 0)];

  const ids = new Set();
  for (const c of categories) {
    if (ids.has(c.id)) throw new Error('Duplicate category id: ' + c.id);
    ids.add(c.id);
  }

  const data = {
    meta: {
      totalTools: categories.reduce((n, c) => n + c.tools.length, 0),
      totalCategories: categories.length,
      lastUpdated,
      repoUrl: REPO_URL,
    },
    featured: { top3, alternatives, comparisonTable },
    trending: trendingSection ? parseTrending(trendingSection) : null,
    removed: removedSection ? parseRemoved(removedSection) : null,
    categories,
  };

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${data.meta.totalTools} tools in ${data.meta.totalCategories} categories (updated ${lastUpdated}).`);
}

build();
