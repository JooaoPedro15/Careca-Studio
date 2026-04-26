# Prompt Claude Code — Módulo 2: Partner Scout (Careca Studio)

> Cole este prompt no Claude Code **só depois de ter o Media Kit Editor v1 funcional**.

---

## Contexto

O **Partner Scout** é o segundo módulo do Careca Studio. Encontra marcas **certas** no **momento certo**, roteando cada lead pro canal comercial correto.

**DOIS CANAIS COMERCIAIS:**

1. **Canal Principal (YouTube + TikTok games)** — aceita:
   - AAA, Indie, Mobile, Plataformas gaming, Energéticos/snacks gamer
   - Performance vendável: **shorts com 100k-350k views combinadas por publicação**

2. **TikTok React (secundário)** — aceita:
   - Streaming, Anime, Plataformas de vídeo

**POSICIONAMENTO SHORTS-FIRST:**
- O João é criador shorts-first. Vídeo longo entrega só 1k-5k views e **não é produto viável de tabela**.
- Pitches devem sempre oferecer **bundles de shorts** como produto principal.
- Vídeo longo só aparece se o lead pedir explicitamente — aí vai como "sob consulta".

Cada lead detectado recebe `targetChannel: 'main' | 'react'` via Niche Classifier.

Stack: **Electron + TypeScript + React**. Scraping em worker process (Node.js + Playwright).

---

## O que construir

Módulo `partner-scout` com:

### 1. Dashboard de Leads
- Top 10 leads do dia
- **Tabs por canal alvo**: "Todos" | "Canal Principal (Games)" | "TikTok React (Streaming/Anime)"
- Filtros: subnicho, ticket estimado, timing
- Cada lead: logo, subnicho, score, badge do canal alvo, sinais, data, botões "Gerar pitch" e "Marcar como contatado"

### 2. Detalhe do Lead
- Info da marca (site, contato mkt)
- Evidências ("Patrocinou Gusta em 12/04", "Lançamento em 28 dias")
- Histórico de campanhas detectadas
- Canais similares patrocinados
- Badge destacado de canal alvo
- Botão "Gerar email de pitch"

### 3. Configuração de Fontes
- Canais concorrentes de **games** (Gusta, Brkk, Tteuw, Minerva + editáveis)
- Canais concorrentes de **react de séries/anime** (editáveis — João deve preencher)
- Frequência scraping (padrão 1x/dia às 6h)
- Toggle por subnicho (6 aceitos)

---

## Estrutura de arquivos

```
src/modules/partner-scout/
├── data/
│   ├── leads.store.ts
│   ├── sources.config.ts
│   ├── brands.database.ts
│   └── niche-filters.ts
├── scrapers/
│   ├── youtube-sponsor.scraper.ts
│   ├── tiktok-sponsor.scraper.ts
│   ├── game-release.scraper.ts
│   ├── series-release.scraper.ts
│   └── linkedin-jobs.scraper.ts
├── scoring/
│   ├── niche-classifier.ts
│   ├── fit-calculator.ts
│   ├── timing-detector.ts
│   └── ticket-estimator.ts
├── services/
│   ├── pitch-generator.service.ts
│   └── scheduler.service.ts
└── components/
    ├── ScoutDashboard.tsx
    ├── LeadCard.tsx
    ├── LeadDetail.tsx
    └── SourcesConfig.tsx
```

---

## Niche Classifier

```typescript
type GameNiche = 'aaa' | 'indie' | 'mobile' | 'plataforma_gaming' | 'energetico_snack';
type StreamingNiche = 'streaming' | 'anime' | 'plataforma_video';
type AcceptedNiche = GameNiche | StreamingNiche;
type TargetChannel = 'main' | 'react';

interface Classification {
  accepted: boolean;
  niche: AcceptedNiche | null;
  targetChannel: TargetChannel | null;
  confidence: number;
  reasoning: string;
}

const NICHE_TO_CHANNEL: Record<AcceptedNiche, TargetChannel> = {
  aaa: 'main',
  indie: 'main',
  mobile: 'main',
  plataforma_gaming: 'main',
  energetico_snack: 'main',
  streaming: 'react',
  anime: 'react',
  plataforma_video: 'react',
};
```

Lógica:
- Base hardcoded de marcas conhecidas
- Palavras-chave games vs streaming
- Adaptação cross-canal (The Last of Us, Fallout, Witcher) → sugerir Bundle Cross-Canal
- Confiança <0.6 → "review manual"

---

## Scrapers

### 1. YouTube Sponsor Scraper (games)
4 canais concorrentes:
- Últimos 30 vídeos via YouTube Data API
- Extrai de descrição: UTM, cupom, @marca, #ad #publi
- Pinned comment
- Output: `{ channelId, videoId, detectedBrands, date, sourceChannelNiche: 'games' }`

### 2. TikTok Sponsor Scraper (react)
Canais de react concorrentes via Playwright headless:
- Varrer posts recentes
- Detectar hashtags de publi, menção a marca, logo de estúdio
- Delays generosos (3-5s), user-agent rotativo
- Output: `{ channelHandle, videoId, detectedBrands, date, sourceChannelNiche: 'react' }`

### 3. Game Release Scraper
- Reusa Game Scout
- Jogos próximos 60 dias
- Output: `{ gameTitle, publisher, releaseDate, niche, targetChannel: 'main' }`

### 4. Series Release Scraper
- TMDB API + Jikan/MyAnimeList
- Séries/animes estreando próximos 60 dias
- Filtrar por plataforma
- Output: `{ title, platform, releaseDate, type, targetChannel: 'react' }`

### 5. LinkedIn Jobs Scraper (fase 2)
- Vagas "influencer marketing" em empresas gaming E streaming
- Output: `{ company, jobTitle, postedDate, niche, targetChannel }`

---

## Scoring de fit (0-100)

```typescript
interface FitScore {
  nicheAlignment: number;
  timingScore: number;
  competitorProof: number;
  budgetFit: number;
  total: number;
}
```

### Niche Alignment (0-30)

| Subnicho | Canal | Pontos |
|---|---|---|
| AAA | main | 30 |
| Plataforma gaming | main | 28 |
| Streaming | react | 26 |
| Mobile | main | 25 |
| Anime | react | 24 |
| Energético/snack | main | 22 |
| Plataforma vídeo | react | 18 |
| Indie | main | 18 |
| Não classificado | — | 0 (rejeitado) |

### Timing Score (0-25)

- Lançamento (jogo ou série) próximos 30d: **+25**
- Lançamento próximos 60d: **+18**
- Vaga marketing aberta <14d: **+20**
- Patrocinou concorrente últimos 7d: **+22**
- Patrocinou concorrente 8-30d atrás: **+12**
- Sem sinal: **+0**

### Competitor Proof (0-25)

- 3+ canais similares: **+25**
- 1-2 canais similares: **+15**
- Nunca patrocinou nicho: **+5**

Similaridade dentro do mesmo canal alvo.

### Budget Fit (0-20)

| Ticket estimado | Pontos |
|---|---|
| R$ 15k+ | 20 |
| R$ 8-15k | 17 |
| R$ 4-8k | 12 |
| R$ 2-4k | 6 |
| <R$ 2k ou desconhecido | 2 |

---

## Output diário

Scheduler 6h:
- Top 10 leads (ambos canais)
- Notificação agrupada: "João, 5 leads hoje: 3 games + 2 streaming"
- Export opcional em Markdown

---

## Pitch Generator (shorts-first)

Dado lead + Media Kit, gera 2 versões:

**Versão 1 — Proativa**
- Gancho específico ao canal:
  - Games: "Vi que vocês anunciaram X pra Y de julho"
  - Streaming: "Vi que a série Z estreia em X dias"
- **Destaque de performance de shorts**: "Meus shorts entregam 100k-350k views combinadas (YouTube + TikTok) em 7 dias"
- Prova social (cases do canal correto)
- Proposta centrada em **bundle de shorts** (nunca vídeo longo)
- Menciona canal veicular explicitamente
- Anexa Media Kit (template games OU streaming OU completo)
- CTA suave

**Versão 2 — Reativa**
- Direta, já entra em proposta com bundle específico
- Se lead perguntar sobre vídeo longo, responde que faz "sob consulta" mas sugere o bundle de shorts como melhor performance

Template de mensagem deve **sempre destacar números de shorts**, nunca mencionar performance de vídeo longo.

---

## Lógica de seleção de bundle (atualizada shorts-first)

```typescript
function suggestBundle(lead: Lead): Bundle {
  const { niche, targetChannel, timingSignal, estimatedTicket, isRecurrentOpportunity } = lead;

  // Canal alvo: main (games)
  if (targetChannel === 'main') {
    if (isRecurrentOpportunity) return 'mensal_games';  // R$ 32k/mês — maior ticket
    if (niche === 'aaa' && timingSignal === 'launch_30d') return 'gaming_launch';
    if (niche === 'indie' && timingSignal === 'launch_30d') {
      return estimatedTicket < 15000 ? 'gaming_launch_negotiable' : 'gaming_launch';
    }
    if (niche === 'mobile') return 'mobile_game';
    if (niche === 'plataforma_gaming') return 'plataforma_gaming';
    if (niche === 'energetico_snack') return 'energetico_snack';
    return 'starter_games';
  }

  // Canal alvo: react (streaming/anime)
  if (targetChannel === 'react') {
    if ((niche === 'anime' || niche === 'streaming') && timingSignal === 'season_launch') return 'anime_season';
    if ((niche === 'anime' || niche === 'streaming') && timingSignal === 'launch_30d') return 'streaming_launch';
    if (isRecurrentOpportunity) return 'mensal_streaming';
    return 'starter_streaming';
  }

  // Cross-canal: adaptações
  if (lead.isGameAdaptation) return 'cross_canal';

  return 'tabela_base';
}
```

**Priorização de ticket no pitch:**
1. Se há sinal de oportunidade recorrente → priorizar bundle mensal (maior receita)
2. Se há lançamento próximo → priorizar bundle de launch (ticket grande pontual)
3. Se lead frio/desconhecido → starter como entrada pra construir relação

---

## Fases de build

### Fase 1 — Core scraping games + react (5-7 dias)
1. YouTube Sponsor Scraper (canais games)
2. TikTok Sponsor Scraper (canais react, Playwright)
3. Niche Classifier 6 subnichos (80+ marcas hardcoded inicial)
4. Banco de marcas
5. Scoring básico
6. Dashboard com tabs por canal alvo

### Fase 2 — Timing e pitch (4-5 dias)
1. Game Release Scraper (reusa Game Scout)
2. Series Release Scraper (TMDB + MAL)
3. Timing detector
4. Pitch generator shorts-first com seleção de bundle e Media Kit correto
5. Notificação desktop agrupada

### Fase 3 — Expansão (opcional, 3+ dias)
1. LinkedIn Jobs scraper
2. Histórico de performance
3. Detecção automática de adaptações cross-canal

---

## Critérios de aceite (Fase 1)

- [ ] Scraper games detecta 10+ marcas de canais concorrentes em 30 dias
- [ ] Scraper react detecta marcas de streaming/anime em 3+ canais
- [ ] Niche Classifier atribui canal certo (Ubisoft→main, Netflix→react, Monster→main, Crunchyroll→react)
- [ ] Dashboard mostra tabs separadas por canal alvo
- [ ] Lead detail mostra badge de canal
- [ ] Scheduler 6h automático
- [ ] Rejeita marcas fora dos 6 subnichos
- [ ] Pitch gerado **sempre** sugere bundle de shorts, nunca vídeo longo como principal

---

## Observações

- **Rate limits YouTube API**: 10k units/dia. Máx 20-30 canais.
- **TikTok scraping**: cuidado com bloqueio. Delays 3-5s, user-agent rotativo. Plano B: 1x/3 dias.
- **LinkedIn**: API oficial ou pular.
- **Privacidade**: só dados corporativos públicos.
- **Persistência**: `electron-store`. Migrar pra SQLite se crescer.
- **Integração com Media Kit**: Pitch Generator importa `~/.careca-studio/mediakit.active.json` e escolhe template (games/streaming/completo) conforme canal alvo.
- **Crítico**: Pitch Generator **nunca** deve oferecer vídeo longo como proposta principal. Sempre shorts.

Comece pela Fase 1, pare ao final, valide antes de seguir.
