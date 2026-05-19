# RenderEstate 3D

App web mobile-first para capturar, processar e compartilhar **ambientes 3D de imóveis**
diretamente do celular.

Este repositório contém o **MVP (Fase 1)**: autenticação, dashboard, CRUD de espaços,
upload de vídeo/imagens, processamento **mockado** e visualizador público em
Three.js / React Three Fiber. A arquitetura já está preparada para plugar um pipeline
real de Gaussian Splatting (`gsplat` / `graphdeco-inria/gaussian-splatting`) no futuro.

A spec completa está em [`SPEC.md`](SPEC.md).

---

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS**
- **Supabase**: Auth + PostgreSQL + Storage + Realtime
- **Three.js** + **@react-three/fiber** + **@react-three/drei**
- **Zod** para validação

---

## 1. Pré-requisitos

- Node.js 20 ou superior
- Uma conta gratuita no [Supabase](https://supabase.com)

---

## 2. Criar o projeto no Supabase

1. Acesse <https://supabase.com/dashboard> e clique em **New project**.
2. Escolha um nome (ex.: `renderestate-3d`), defina uma senha forte do banco
   e a região mais próxima (ex.: South America — São Paulo).
3. Espere o provisionamento terminar (~1 min).

### 2.1 Desativar confirmação de e-mail (MVP)

Como o MVP não exige confirmação, vá em:

**Authentication → Providers → Email**

E desligue a opção **Confirm email**. Salve.

### 2.2 Rodar as migrações SQL

Em **SQL Editor**, rode os arquivos da pasta `supabase/migrations/` **nesta ordem**:

1. `0001_init.sql` — tabelas, índices, triggers
2. `0002_policies.sql` — Row Level Security
3. `0003_storage.sql` — policies do bucket de storage

> Cada arquivo é idempotente (usa `if not exists` / `drop policy if exists`), então
> você pode rodar de novo se precisar.

### 2.3 Criar o bucket de storage

Em **Storage → New bucket**:

- **Name:** `spaces`
- **Public bucket:** **desligado** (a leitura pública é controlada por policy)

Depois rode `0003_storage.sql` se ainda não rodou.

### 2.4 Pegar as chaves

Em **Settings → API**, copie:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (NUNCA exponha no client!)

---

## 3. Configurar o app localmente

```bash
cp .env.example .env.local
```

Edite `.env.local` com os valores do passo 2.4.

Instale as dependências e rode:

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

### Modelo 3D de exemplo (opcional)

O viewer carrega `/sample-models/sample.glb` por padrão. Veja
[`public/sample-models/README.md`](public/sample-models/README.md) para baixar um
modelo gratuito (1-2 MB). **Se o arquivo não existir, o viewer cai num placeholder
procedural automaticamente** — então você pode pular este passo e testar tudo.

---

## 4. Fluxo do MVP

1. Criar conta (`/register`) → você é logado automaticamente.
2. Criar um espaço (`/spaces/new`).
3. Adicionar capturas (vídeo ou imagens) na tela de captura.
4. Clicar em **Iniciar processamento**. O mock leva ~6 segundos e atualiza o status
   ao vivo via Supabase Realtime.
5. Quando o status virar **Pronto**, copiar o link público e abrir em outra aba ou
   anônimo — visualização 3D **sem login**.

---

## 5. Estrutura

```
/app
  /(auth)/login, /register     -> autenticação
  /(dashboard)/spaces/...      -> área privada do usuário
  /view/[slug]                 -> visualizador público (sem login)
  /api/spaces/...              -> route handlers para CRUD e processamento
/components
  /auth, /spaces, /upload, /viewer, /layout
/lib
  supabase-client.ts, supabase-server.ts, auth.ts, storage.ts,
  validators.ts, slug.ts, env.ts, utils.ts
/server
  jobs.ts, processing.ts       -> mock do worker de Gaussian Splatting
/supabase/migrations           -> SQL para schema + RLS + storage
/types                         -> tipos do banco e dos domínios
/public/sample-models          -> modelo .glb usado pelo viewer enquanto
                                  o pipeline real não existe
```

---

## 6. Roadmap

- **Fase 1 — MVP** *(este repositório)*
  Fluxo completo com processamento mockado.

- **Fase 2 — Processamento real**
  Worker em Python (CUDA) consumindo a fila e rodando
  [`gsplat`](https://github.com/nerfstudio-project/gsplat) ou
  [`graphdeco-inria/gaussian-splatting`](https://github.com/graphdeco-inria/gaussian-splatting).
  Geração de `.ply` / `.splat` / `.spz` e upload para o storage. Substitui o mock
  em [`server/processing.ts`](server/processing.ts) — o resto do app não muda.

- **Fase 3 — Viewer web de Gaussian Splat**
  Trocar o `<Model>` do `SplatViewer.tsx` por um renderizador WebGL de splats
  (ex.: mkkellogg/gaussian-splats-3d, antimatter15/splat).

- **Fase 4 — iOS premium**
  App nativo com ARKit / RoomPlan +
  [`MetalSplatter`](https://github.com/scier/MetalSplatter) para renderização
  nativa de splats em iPhones Pro com LiDAR.

---

## 7. Segurança

- Todas as tabelas têm **RLS** habilitado.
- Usuário autenticado só vê/edita os próprios espaços.
- Visitantes acessam apenas spaces com `is_public=true` **e** `status='completed'`.
- `SUPABASE_SERVICE_ROLE_KEY` só é usada no `server/processing.ts` (worker mock)
  e nunca é exposta no client.

---

## 8. Comandos úteis

```bash
npm run dev         # dev server
npm run build       # build de produção
npm run start       # rodar build
npm run typecheck   # verificação de tipos
```
