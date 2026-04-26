# Prompt Claude Code — Módulo 1: Media Kit Editor (Careca Studio)

> Cole este prompt inteiro no Claude Code a partir da raiz do projeto Careca Studio.

---

## Contexto

Você vai implementar o **primeiro módulo funcional** do Careca Studio: o **Media Kit Editor**. Precisa estar pronto antes do Partner Scout.

Stack (já definida na SKILL.md do Careca Studio): **Electron + TypeScript + React**, visual dark/gamer, sidebar, fontes Space Grotesk + JetBrains Mono, base `#0e0e10` + accent `#7c3aed`.

Canal de referência: **Roberto Careca** — 400K+ inscritos YouTube principal (PT-BR), ~10M views/mês agregados.

---

## 🎯 Arquitetura de canais comerciais

O João monetiza **dois canais distintos**:

| Canal | Conteúdo | Performance | Nichos aceitos |
|---|---|---|---|
| **Canal Principal (YouTube + TikTok games)** | Games, gameplay | Shorts: 50k-150k YT + 50k-200k TikTok por vídeo | AAA, indie, mobile, plataformas, energético/snack |
| **TikTok React (secundário)** | React de séries/animes | (manual — preencher dados) | Streaming, anime, plataformas de vídeo |

**IMPORTANTE — posicionamento comercial:**
- O João é **shorts-first**. Shorts são o produto principal, tanto em volume quanto em performance.
- Vídeo longo entrega apenas 1k-5k views — **não é produto viável de tabela**.
- Shorts combinados (YT + TikTok) entregam **100k-350k views por publicação**. É isso que vai no mídia kit.

**NÃO incluir** canais Linguana (ES/EN/DE).

---

## O que construir

Módulo `media-kit` acessível pela sidebar com 3 telas:

### 1. Dashboard do Media Kit
- Preview em miniatura de cada slide (grid 2x3 ou 3x2)
- Botões "Editar slide", "Exportar PDF", "Exportar PNGs individuais"
- Indicador "Última atualização: há X dias" + botão "Sincronizar métricas agora"
- **Seletor de perfil**: "Kit completo" | "Kit games" | "Kit streaming/anime"

### 2. Editor de Campos
- Formulário limpo à esquerda, preview ao vivo à direita
- Abas por slide: Capa, Sobre, Audiência, Canais, Performance, Cases, Preços, Contato
- Indicadores: 🔄 auto | ✏️ manual | 🔗 integrado

### 3. Gerenciador de Templates
Três perfis ativos: `completo`, `games`, `streaming`.

---

## Estrutura de arquivos

```
src/modules/media-kit/
├── data/
│   ├── mediakit.schema.ts
│   ├── mediakit.default.json
│   └── templates/
│       ├── completo.template.ts
│       ├── games.template.ts
│       └── streaming.template.ts
├── services/
│   ├── youtube-api.service.ts
│   ├── placeholder-resolver.ts
│   ├── publi-pricer.bridge.ts
│   └── exporter.service.ts
├── components/
│   ├── MediaKitDashboard.tsx
│   ├── MediaKitEditor.tsx
│   ├── SlidePreview.tsx
│   ├── FieldInput.tsx
│   └── slides/
│       ├── CoverSlide.tsx
│       ├── AboutSlide.tsx
│       ├── AudienceSlide.tsx
│       ├── ChannelsSlide.tsx
│       ├── PerformanceSlide.tsx    # novo — destaque de shorts
│       ├── CasesSlide.tsx
│       ├── PricingSlide.tsx
│       └── ContactSlide.tsx
└── index.tsx
```

---

## Schema (mediakit.schema.ts)

```typescript
export type MediaKitTemplate = 'completo' | 'games' | 'streaming';
export type CommercialChannel = 'main' | 'react';

export interface ShortsPerformance {
  platform: 'youtube' | 'tiktok';
  avgViews: number;           // média por short
  medianViews: number;        // mediana (mais honesto que média)
  topViews: number;           // melhor performance
  retentionRate?: number;     // % que assiste até o fim
  avgEngagement?: number;     // likes+comments / views
}

export interface MediaKitData {
  meta: {
    version: string;
    lastUpdated: string;
    activeTemplate: MediaKitTemplate;
  };

  creator: {
    displayName: string;
    realName: string;
    bio: string;                // destacar posicionamento shorts-first
    positioning: string;        // ex: "Criador shorts-first de games com 100k-350k views combinados por publicação"
    differentials: string[];
    photoUrl: string;
  };

  commercialChannels: {
    main: {
      label: 'Canal Principal — Games';
      description: string;
      youtube: {
        channelId: string;
        handle: string;
        subscribers: number;     // auto
        monthlyViews: number;    // auto
        shortsPerformance: ShortsPerformance;  // DESTAQUE principal
        lastSyncedAt: string;
      };
      tiktok: {
        handle: string;
        followers: number;
        shortsPerformance: ShortsPerformance;  // DESTAQUE principal
      };
      instagram?: {
        handle: string;
        followers: number;
      };
      acceptedNiches: Array<'aaa' | 'indie' | 'mobile' | 'plataforma_gaming' | 'energetico_snack'>;
    };
    react: {
      label: 'TikTok React — Séries e Animes';
      description: string;
      tiktok: {
        handle: string;
        followers: number;
        shortsPerformance: ShortsPerformance;
      };
      acceptedNiches: Array<'streaming' | 'anime' | 'plataforma_video'>;
    };
  };

  // Destaque no slide Performance: "Média combinada por publicação em shorts"
  combinedShortsReach: {
    main: {
      averagePerPublication: number;   // soma YT+TikTok em média
      label: string;                   // ex: "150k views combinadas em 7 dias"
    };
    react: {
      averagePerPublication: number;
      label: string;
    };
  };

  audience: {
    main: {
      ageRanges: Array<{ range: string; percent: number }>;
      genderSplit: { male: number; female: number; other: number };
      topCountries: Array<{ country: string; percent: number }>;
      interests: string[];
    };
    react: {
      ageRanges: Array<{ range: string; percent: number }>;
      genderSplit: { male: number; female: number; other: number };
      topCountries: Array<{ country: string; percent: number }>;
      interests: string[];
    };
  };

  cases: Array<{
    brand: string;
    campaign: string;
    channel: CommercialChannel;
    format: 'short' | 'short_series' | 'bundle' | 'stories' | 'stream';
    results: string;             // ex: "850k views combinadas em 72h"
    thumbnailUrl: string;
    date: string;
  }>;

  pricing: {
    lastSyncedAt: string;
    items: Array<{
      name: string;
      price: number;
      description: string;
      channel: CommercialChannel;
      isBundle: boolean;
      idealFor?: string[];
      underDemand?: boolean;     // true pra vídeo longo (não lista, só sob consulta)
    }>;
  };

  contact: {
    email: string;
    whatsapp?: string;
    manager?: { name: string; email: string };
  };
}
```

---

## Slide Performance (novo — destaque principal)

Este é o slide mais importante do kit porque posiciona shorts como produto herói.

**Conteúdo visual:**
- Grande número em destaque: **"100k-350k views combinadas por publicação"**
- Breakdown por plataforma:
  - YouTube Shorts: 50k-150k por vídeo
  - TikTok: 50k-200k por vídeo
- Top 3 shorts dos últimos 90 dias com thumbnail + número de views
- Retenção média (se tiver dado)
- Placeholder pra gráfico simples de views/mês

**O que NÃO colocar:**
- Números de vídeo longo
- Comparações que exponham fragilidade do longo

---

## Placeholders dinâmicos

| Token | Resolve em |
|---|---|
| `{mes_atual}` | "Abril" |
| `{mes_anterior}` | "Março" |
| `{ano_atual}` | "2026" |
| `{ano_anterior}` | "2025" |
| `{data_hoje}` | "22/04/2026" |
| `{inscritos_main}` | "427K" |
| `{views_mensais_main}` | "10.2M" |
| `{shorts_avg_combined_main}` | "150k" (YT + TikTok média) |
| `{shorts_top_main}` | "850k" (melhor short) |
| `{seguidores_react}` | TikTok react |

`placeholder-resolver.ts` com função pura.

---

## YouTube Data API v3

- Auth: OAuth2
- Endpoints: `channels.list`, `search.list` + `videos.list` filtrado por shorts (`videoDuration=short` + duração ≤60s), YouTube Analytics
- Calcular médias dos shorts dos últimos 90 dias (não todos os vídeos — só shorts)
- Cache 6h, botão "Sincronizar agora"

---

## Bridge com publi-pricer

`publi-pricer.bridge.ts`: lê `~/.careca-studio/pricing.json`, `fs.watch` pra atualizações, fallback manual.

---

## 💰 Preços e bundles recalibrados (shorts-first)

### Tabela base — Canal Principal (Games)

```json
{
  "items": [
    {
      "name": "Short patrocinado (YouTube + TikTok games)",
      "price": 4500,
      "channel": "main",
      "description": "1 short 60s publicado em YouTube Shorts + TikTok games. Média combinada 100k-350k views nos primeiros 7 dias. Menção orgânica integrada ao conteúdo.",
      "isBundle": false
    },
    {
      "name": "Short exclusivo YouTube Shorts",
      "price": 2500,
      "channel": "main",
      "description": "1 short apenas no YouTube (50k-150k views em 7 dias). Ideal pra marcas que querem aparecer só em uma plataforma.",
      "isBundle": false
    },
    {
      "name": "Short exclusivo TikTok",
      "price": 2800,
      "channel": "main",
      "description": "1 short apenas no TikTok (50k-200k views em 7 dias).",
      "isBundle": false
    },
    {
      "name": "Gameplay sponsored stream",
      "price": 6500,
      "channel": "main",
      "description": "1h+ de live gameplay com menções orgânicas do produto/jogo. Clipes editados em shorts depois (aumenta alcance pós-stream).",
      "isBundle": false
    },
    {
      "name": "Stories pack Instagram (3 stories)",
      "price": 1800,
      "channel": "main",
      "description": "3 stories sequenciais com link/CTA, 24h.",
      "isBundle": false
    },
    {
      "name": "Vídeo longo dedicado",
      "price": 0,
      "channel": "main",
      "description": "Formato sob consulta. Tarifa negociada caso a caso dependendo do escopo.",
      "isBundle": false,
      "underDemand": true
    }
  ]
}
```

### Tabela base — TikTok React (Streaming/Anime)

```json
{
  "items": [
    { "name": "TikTok react single (30-60s)", "price": 2800, "channel": "react", "description": "1 TikTok react com menção integrada. Ideal pra lançamento de trailer/reveal.", "isBundle": false },
    { "name": "TikTok react série (3 vídeos semanais)", "price": 7500, "channel": "react", "description": "3 TikToks cobrindo episódios/arcos diferentes, postados 1x/semana.", "isBundle": false },
    { "name": "TikTok react dedicado (60-90s)", "price": 4000, "channel": "react", "description": "TikTok focado 100% na obra/produto da marca.", "isBundle": false }
  ]
}
```

### Bundles — Canal Principal (Games) [recalibrados shorts-first]

```json
{
  "bundles_games": [
    {
      "name": "Starter Games — Teste de canal",
      "channel": "main",
      "items": ["1 short YouTube + TikTok"],
      "listPrice": 4500,
      "bundlePrice": 4500,
      "discount": "0%",
      "pitch": "Entrada para marcas testando o canal. Alcance combinado de 100k-350k views em 7 dias. Métrica rápida e barata.",
      "ticketMedio": "R$ 4.500",
      "idealPara": ["aaa", "indie", "energetico_snack"]
    },
    {
      "name": "Gaming Launch — AAA/Indie (Burst de Shorts)",
      "channel": "main",
      "items": ["3 shorts em sequência (dia 1, dia 4, dia 7)", "1 gameplay sponsored stream", "2 stories de reforço"],
      "listPrice": 23600,
      "bundlePrice": 19000,
      "discount": "19%",
      "pitch": "Burst de shorts em 7 dias cria efeito de dominância no feed durante janela de lançamento. 3 shorts = 300k-1M views combinadas. Stream entrega gameplay real, stories fecham CTAs.",
      "ticketMedio": "R$ 19.000",
      "estimatedReach": "400k-1.2M views",
      "idealPara": ["aaa", "indie"]
    },
    {
      "name": "Mobile Game — Gacha/RPG (Foco em conversão)",
      "channel": "main",
      "items": ["2 shorts dedicados com gameplay", "3 stories com código/cupom", "1 short de follow-up em 14 dias"],
      "listPrice": 16200,
      "bundlePrice": 13000,
      "discount": "20%",
      "pitch": "Formato desenhado pra conversão em mobile. Shorts geram awareness e demonstração, stories fecham instalação com cupom. Follow-up em 14 dias captura players que não converteram na 1ª vez.",
      "ticketMedio": "R$ 13.000",
      "estimatedReach": "300k-700k views",
      "idealPara": ["mobile"]
    },
    {
      "name": "Plataforma Gaming — Game Pass/PS Plus/GFN",
      "channel": "main",
      "items": ["4 shorts cobrindo jogos diferentes do catálogo (1 por semana por 1 mês)", "1 gameplay sponsored stream"],
      "listPrice": 24500,
      "bundlePrice": 19500,
      "discount": "20%",
      "pitch": "Formato sustentado pra plataformas de assinatura. 4 shorts mostram variedade do catálogo (cada um com jogo diferente), stream reforça proposta de valor do serviço. Presença de 1 mês no feed.",
      "ticketMedio": "R$ 19.500",
      "estimatedReach": "400k-1.4M views",
      "idealPara": ["plataforma_gaming"]
    },
    {
      "name": "Energético/Snack Gamer",
      "channel": "main",
      "items": ["4 shorts com produto em cena durante gameplay", "1 gameplay sponsored stream", "2 stories"],
      "listPrice": 24800,
      "bundlePrice": 19500,
      "discount": "21%",
      "pitch": "Produto aparece em consumo natural durante gameplay/shorts. Alta recall visual sem parecer forçado. Stream entrega 1h+ de exposição contínua.",
      "ticketMedio": "R$ 19.500",
      "estimatedReach": "400k-1M views",
      "idealPara": ["energetico_snack"]
    },
    {
      "name": "Mensal Games — Parceria recorrente",
      "channel": "main",
      "items": ["8 shorts/mês (2 por semana)", "1 gameplay sponsored stream/mês", "4 stories/mês"],
      "listPrice": 43000,
      "bundlePrice": 32000,
      "discount": "26%",
      "pitch": "Presença sustentada no feed. 8 shorts/mês = 800k-2.4M views combinadas mensais. Contrato mínimo 3 meses. Escala: 3m -26%, 6m -31%, 12m -36%.",
      "ticketMedio": "R$ 32.000/mês",
      "estimatedReach": "800k-2.4M views/mês",
      "idealPara": ["aaa", "indie", "mobile", "plataforma_gaming", "energetico_snack"]
    }
  ]
}
```

### Bundles — TikTok React (Streaming/Anime)

```json
{
  "bundles_streaming": [
    {
      "name": "Starter Streaming — Lançamento pontual",
      "channel": "react",
      "items": ["1 TikTok react dedicado"],
      "listPrice": 4000,
      "bundlePrice": 4000,
      "discount": "0%",
      "pitch": "Entrada pra plataformas testando o canal. Ideal pra trailer/reveal/estreia.",
      "ticketMedio": "R$ 4.000",
      "idealPara": ["streaming", "anime"]
    },
    {
      "name": "Streaming Launch — Série/Temporada",
      "channel": "react",
      "items": ["1 TikTok react dedicado no lançamento", "3 TikToks react semanais cobrindo episódios", "1 TikTok de reação final/review"],
      "listPrice": 14300,
      "bundlePrice": 11500,
      "discount": "20%",
      "pitch": "Cobertura completa do lançamento. Trailer react → acompanhamento semanal → review final. Engajamento contínuo durante a temporada.",
      "ticketMedio": "R$ 11.500",
      "idealPara": ["streaming", "anime"]
    },
    {
      "name": "Anime Season — Temporada completa",
      "channel": "react",
      "items": ["1 TikTok react do 1º episódio", "TikToks react semanais (até 12 semanas)", "1 TikTok de reação final"],
      "listPrice": 38000,
      "bundlePrice": 28000,
      "discount": "26%",
      "pitch": "Formato premium pra plataformas de anime. Cria eventos semanais que o público espera, gera tráfego recorrente por 3 meses.",
      "ticketMedio": "R$ 28.000",
      "idealPara": ["anime", "streaming"]
    },
    {
      "name": "Mensal Streaming — Parceria recorrente",
      "channel": "react",
      "items": ["4 TikToks react/mês cobrindo conteúdo da plataforma"],
      "listPrice": 11200,
      "bundlePrice": 8800,
      "discount": "21%",
      "pitch": "Presença constante. Contrato mínimo 3 meses. Escala: 3m -21%, 6m -26%, 12m -31%.",
      "ticketMedio": "R$ 8.800/mês",
      "idealPara": ["streaming", "anime", "plataforma_video"]
    }
  ]
}
```

### Bundles cross-canal (premium)

```json
{
  "bundles_cross": [
    {
      "name": "Cross-Canal — Adaptação de game em série/filme",
      "channel": "main+react",
      "items": ["2 shorts no canal games (foco no IP original)", "2 TikToks react no canal react (cobrindo a adaptação)"],
      "listPrice": 14600,
      "bundlePrice": 12000,
      "discount": "18%",
      "pitch": "Formato único pra IPs que atravessam games e streaming (The Last of Us, Fallout, Witcher). Cobre os dois públicos com conteúdo alinhado. Raros criadores entregam isso com autoridade nos dois nichos.",
      "ticketMedio": "R$ 12.000",
      "idealPara": ["streaming", "aaa"]
    }
  ]
}
```

### Apresentação no slide de Preços

Ordem de destaque no template `games`:
1. **Grande card do bundle Mensal** (ticket alto + recorrência = melhor deal pro João)
2. **Bundle Gaming Launch** (ticket alto, timing claro)
3. **Bundle Mensal alternativos por nicho** (Mobile, Plataforma, Energético)
4. Tabela base em quadro compacto abaixo
5. Linha pequena: "Vídeo longo disponível sob consulta"

Disclaimer: "Valores de referência. Ajustes conforme complexidade, exclusividade, período, mídia paga (whitelisting), direitos de uso e urgência."

---

## Ordem de build

### Fase 1 — MVP (4-6 dias)
1. Schema + JSON default com dados reais
2. Placeholder resolver + testes
3. Editor com preview lado a lado (dados estáticos)
4. 5 slides: Capa, Canais, **Performance** (destaque de shorts), Preços, Contato
5. Export PDF via `react-to-pdf` ou `puppeteer-core`
6. Seletor de template

### Fase 2 — Integrações (2-3 dias)
1. YouTube Data API com filtro de shorts específico
2. Bridge publi-pricer
3. Export PNGs

### Fase 3 — Completar (1-2 dias)
1. Sobre, Audiência, Cases

---

## Critérios de aceite

- [ ] Slide Performance destaca shorts como produto principal (números grandes de views combinadas)
- [ ] Vídeo longo aparece apenas em linha pequena "sob consulta" no slide de Preços
- [ ] Template `games` mostra 6 bundles recalibrados shorts-first
- [ ] Template `streaming` mostra 4 bundles de TikTok react
- [ ] Sync YouTube API retorna métricas de shorts (não mistura com vídeo longo)
- [ ] Export PDF A4 landscape em qualidade de email
- [ ] Placeholders resolvem
- [ ] publi-pricer atualiza em tempo real

---

## Observações

- **NÃO** usar localStorage. `electron-store` em `userData`.
- Editor template-based.
- Slide Performance é o slide mais importante. Design dele precisa passar confiança imediata — números grandes, comparações visuais.
- Código em português. Commits em português.

Comece pela Fase 1. Ao final, valide antes de seguir.
