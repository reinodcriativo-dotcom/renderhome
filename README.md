# RenderAR

Catálogo de produtos 3D em **realidade aumentada ancorada em QR code**.
Pensado para lojas físicas: tênis, móveis, eletrônicos, qualquer produto
que valha mostrar em volume antes da compra.

**Fluxo:**

1. **Lojista (logado)** sobe um modelo `.glb` do produto, define preço e
   etiquetas. Sistema gera um QR único.
2. Lojista imprime o QR e coloca na prateleira/produto físico.
3. **Cliente** aponta a câmera do celular para o QR → o link abre no
   navegador → permissão de câmera → o produto 3D aparece flutuando em cima
   do QR, com etiquetas de preço/descrição ao lado.

Sem app pra instalar, sem servidor de GPU, sem custos por job. Stack web
inteira, hospedada em Vercel + Supabase grátis.

> Este repositório nasceu como **RenderHome** (captura 3D de imóveis com
> Gaussian Splatting / fotogrametria). Pivotou em 2026-05-19 para AR de
> produtos quando o custo/complexidade de reconstrução 3D real se mostrou
> inviável sem GPU dedicada. A história está no git e em `SPEC.md`.

---

## Stack

- **Frontend (Vercel)**: Next.js 15 + React 19 + TypeScript + Tailwind
- **Backend (Supabase)**: Auth + PostgreSQL + Storage + Realtime
- **3D**: Three.js + @react-three/fiber + @react-three/drei
- **A adicionar (Fases 3-4)**: `mind-ar` (rastreamento de QR), `qrcode`
  (geração de QR), `@mind-ar/compiler` (gera arquivos `.mind` de tracking)

---

## Fases

1. **Schema + cleanup do pivô** ✅ *(este commit)*
   Schema novo (`products`, `product_overlays`), drop tabelas antigas,
   código obsoleto removido, stub pages.
2. **Dashboard CRUD de produtos** + upload de `.glb` *(próximo)*
3. **Geração de QR** + compilação do `.mind` (target de tracking)
4. **Página AR pública** `/ar/[slug]` (MindAR + Three.js)
5. **Editor de overlays** (preço, etiquetas, badges posicionadas em 3D)

---

## Setup

### 1. Pré-requisitos

- Node.js 20+
- Conta gratuita no Supabase

### 2. Provisionar o Supabase

Se for um projeto **NOVO**, rode em ordem em **SQL Editor**:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_policies.sql`
3. Crie o bucket `spaces` em **Storage → New bucket** (Public: **desligado**)
4. `supabase/migrations/0003_storage.sql`
5. `supabase/migrations/0010_renderar_pivot.sql` ← este faz o pivot

Se o projeto **já estava no RenderHome antigo**, rode apenas o `0010_renderar_pivot.sql`
— ele dropa as tabelas antigas e cria as novas.

Em **Authentication → Providers → Email**: desligue *Confirm email* (MVP
não exige confirmação).

Em **Settings → API Keys**, copie:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Secret key → `SUPABASE_SERVICE_ROLE_KEY` (privada, **nunca** no client)

### 3. Rodar localmente

```bash
cp .env.example .env.local
# preenche as 3 chaves do Supabase em .env.local
npm install
npm run dev
```

Abra <http://localhost:3000>.

---

## Estrutura

```
/app
  /(auth)/login, /register     -> autenticação
  /(dashboard)/products/...    -> CRUD de produtos do lojista [Fase 2+]
  /ar/[slug]                   -> experiência AR pública [Fase 4]
  /api/products/...            -> route handlers (Fase 2+)
/components/auth, /layout      -> compartilhados
/lib                           -> supabase clients, validators, utils
/supabase/migrations           -> SQL: 0001-0003 (antigo) + 0010 (pivot)
/types                         -> database, product types
```

---

## Comandos

```bash
npm run dev         # dev server
npm run build       # build de produção
npm run start       # rodar build
npm run typecheck   # verificação de tipos
```

---

## Segurança

- Todas as tabelas têm **RLS** habilitado.
- Usuário autenticado só vê/edita os próprios produtos.
- Visitantes acessam apenas produtos com `is_public=true` **e** `status='ready'`.
- `SUPABASE_SERVICE_ROLE_KEY` é privada e usada só em rotas de servidor de
  confiança (nunca no client).
