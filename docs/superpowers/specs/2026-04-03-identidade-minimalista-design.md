# Careca Studio — Identidade Minimalista

## Objetivo

Transformar o visual do Careca Studio de "template SaaS roxo genérico" para uma identidade minimalista preto/branco que reflita o estilo do canal Roberto Careca.

## Paleta de Cores

| Token | Antes | Depois |
|-------|-------|--------|
| `accent` | `#7c3aed` | `#ffffff` |
| `accent-dim` | `rgba(124,58,237,0.15)` | `rgba(255,255,255,0.08)` |
| `app` | `#0e0e10` | `#050505` |
| `surface` | `#131316` | `#0a0a0a` |
| `dark` | `#0a0a0c` | `#000000` |
| `border` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.08)` |
| `border-light` | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.14)` |
| `text-primary` | `#f0f0f0` | `#ffffff` |
| `text-secondary` | `#a0a0a0` | `#737373` |
| `text-muted` | `#666666` | `#525252` |

Status colors (green/yellow/blue/red) permanecem — são funcionais.

## Ícone/Logo

SVG inline: círculo com arco sutil no topo — silhueta minimalista de cabeça careca. Branco sobre preto. Substitui o ícone Flame na sidebar.

## Gradientes

- Remover radial-gradient roxo do `body` (index.css) e do `App.tsx`
- Substituir por gradiente preto sutil (`#080808` → `#000000`)
- Cards perdem gradientes decorativos — ficam flat com borda fina

## Componentes Atualizados

### Botão Primary
- Fundo branco, texto preto (inversão)
- Shadow branco sutil ao invés de roxo
- Hover: `rgba(255,255,255,0.9)`

### Checkboxes
- Substituir checkboxes nativos por toggle switches custom
- Estilo: pílula com knob, branco quando ativo, cinza quando inativo

### Select/Dropdown
- Substituir `<select>/<option>` nativo por dropdown custom
- Estilo consistente com o design system (fundo escuro, borda, rounded)

### Progress Bar
- Gradiente branco→cinza ao invés de roxo→azul

### Cards
- Border radius reduzido: `32px`/`28px` → `16px`/`12px`
- Sombras reduzidas drasticamente (flat)

### Scrollbar
- Thumb: `rgba(255,255,255,0.15)` ao invés de accent

### Selection
- Background: `rgba(255,255,255,0.20)` ao invés de roxo

## Tipografia

Sem mudanças. Manter Space Grotesk + JetBrains Mono.

## Escopo Excluído

- Estrutura de componentes, props, store, IPC
- Funcionalidade do SubtitleForge
- Layout grid (sidebar + topbar + content)
- Textos/copy existentes
- Pages placeholder (GameScout, ReactScout)
