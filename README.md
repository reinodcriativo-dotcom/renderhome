# RenderEstate 3D / RenderHome

App web mobile-first para capturar, processar e compartilhar **ambientes 3D de
imóveis** diretamente do celular. O front roda em Vercel + Supabase. O
processamento 3D real (fotogrametria) acontece em um **worker local na sua
máquina**, acionado manualmente — sem precisar de cloud paga.

A spec completa do produto está em [`SPEC.md`](SPEC.md).

---

## Arquitetura em uma frase

**Phone** captura vídeo/fotos → upload Supabase Storage → cria job `queued` →
você senta no PC, roda `npm run render`, ele baixa os inputs, chama Meshroom
(fotogrametria com GPU), gera `.glb`, faz upload de volta e atualiza o status →
**Phone** vê o ambiente 3D no link público.

## Stack

- **Frontend (Vercel)**: Next.js 15 + React 19 + TypeScript + Tailwind
- **Backend (Supabase)**: Auth + PostgreSQL + Storage + Realtime
- **Viewer 3D**: Three.js + @react-three/fiber + @mkkellogg/gaussian-splats-3d
- **Worker local**: Node.js (tsx) + Meshroom CLI + ffmpeg + obj2gltf

---

## 1. Pré-requisitos

- Node.js 20+
- Conta gratuita no [Supabase](https://supabase.com)
- (Opcional, para o worker) PC com GPU NVIDIA CUDA + Meshroom instalado

---

## 2. Provisionar o Supabase

1. Crie um projeto em <https://supabase.com/dashboard> (free tier, região mais
   próxima — South America é ideal).
2. **Authentication → Providers → Email** → desligue **Confirm email** (o MVP
   não exige confirmação).
3. **SQL Editor** → rode em ordem os arquivos de [`supabase/migrations/`](supabase/migrations/):
   1. `0001_init.sql` — tabelas, índices, triggers
   2. `0002_policies.sql` — Row Level Security
   3. **Antes** do passo 4, crie o bucket: **Storage → New bucket** com **Name:** `spaces` e **Public bucket: DESLIGADO**
   4. `0003_storage.sql` — policies do bucket
4. **Settings → API Keys** → copie:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Secret key (Reveal) → `SUPABASE_SERVICE_ROLE_KEY` (privada, **nunca** no client)

---

## 3. Rodar o app localmente

```bash
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY no .env.local
npm install
npm run dev
```

Abra <http://localhost:3000>.

---

## 4. Fluxo do app

1. Criar conta (`/register`) → você é logado automaticamente.
2. Criar um espaço (`/spaces/new`).
3. Adicionar capturas: **gravar vídeo** pela câmera do celular ou enviar fotos.
4. Clicar em **Iniciar processamento** → cria um job em `queued`.
5. **(você no PC)** roda `npm run render` → script baixa inputs, processa,
   sobe `.glb`, marca como `completed`.
6. **(de volta no celular)** o status muda ao vivo via Realtime → link público
   funcional em `/view/[slug]`.

---

## 5. Configurar o worker local (Meshroom)

O worker roda **fotogrametria** com Meshroom. Funciona bem com GPU NVIDIA
mesmo de 2GB (é mais leve que Gaussian Splatting). Cobra zero — só sua
eletricidade e tempo do PC.

### 5.1 Instalar Meshroom

1. Baixe a versão Windows em <https://alicevision.org/#meshroom> (~1GB zip).
2. Extraia em algum lugar (ex.: `C:\Tools\Meshroom-2023.3.0\`).
3. Confirme que existe `meshroom_batch.exe` dentro dessa pasta.

> **Mac/Linux**: o pré-build oficial não cobre Apple Silicon. Em Linux roda
> com a build oficial. Mac M1/M2/M3 precisa compilar do source.

### 5.2 Apontar no .env.local

```bash
MESHROOM_PATH=C:\Tools\Meshroom-2023.3.0\meshroom_batch.exe
```

(Use o caminho real onde você extraiu o Meshroom.)

### 5.3 Rodar

```bash
npm run render
```

O script vai:

1. Listar jobs em `queued` / `processing`
2. Pedir pra escolher um (auto se for só um)
3. Baixar fotos/vídeos do Supabase Storage para `./renders/<job-id>/inputs/`
4. Extrair frames de vídeos com ffmpeg-static (2fps, max 1920px)
5. Rodar `meshroom_batch` — **isso leva 30 min a 2h** dependendo da GPU e cena
6. Converter o `texturedMesh.obj` para `.glb` (`obj2gltf`)
7. Subir o `.glb` para o Supabase Storage em `<user_id>/<space_id>/render-*.glb`
8. Atualizar `space.viewer_url` e marcar `status=completed`

A cada etapa o `processing_jobs.progress` é atualizado, e o app no celular
vê via Realtime.

### 5.4 Tunings para baixo VRAM (opcional)

Se Meshroom der OOM (out of memory) com sua GPU de 2GB, edite seu
`.env.local`:

```bash
MESHROOM_PARAM_OVERRIDES=DepthMap:downscale=8,Meshing:maxInputPoints=5000000
```

Isso reduz a resolução do depth map (mais leve em VRAM, qualidade menor).

---

## 6. Estrutura

```
/app
  /(auth)/login, /register     -> autenticação
  /(dashboard)/spaces/...      -> área privada do usuário
  /view/[slug]                 -> visualizador público (sem login)
  /api/spaces/...              -> route handlers (CRUD + dispatch de jobs)
/components/auth /spaces /upload /viewer /layout
/lib                           -> supabase clients, validators, utils
/server/jobs.ts                -> cria job em queued (worker local processa)
/scripts
  render.ts                    -> ENTRY do worker local
  /lib                         -> módulos (supabase, prompt, inputs,
                                  meshroom, convert, upload)
/supabase/migrations           -> SQL para schema + RLS + storage
/types                         -> tipos do banco e dos domínios
```

---

## 7. Comandos

```bash
npm run dev         # dev server (front)
npm run build       # build de produção (front)
npm run start       # rodar build
npm run typecheck   # verificação de tipos
npm run render      # worker local de fotogrametria
```

---

## 8. Roadmap

- **Fase 1 — MVP** ✅
  Auth, dashboard, CRUD de spaces, upload, viewer público com placeholder.
- **Fase 2 — Worker local de fotogrametria** ✅
  Pipeline Meshroom local → `.glb` no Storage. Acionado manualmente.
- **Fase 3 — Gaussian Splatting real**
  Quando houver budget/hardware, trocar Meshroom por `gsplat` (Nerfstudio)
  ou pipeline cloud (RunPod). Output `.ply` em vez de `.glb`. O viewer já
  detecta extensão e usa o renderer correto (mkkellogg).
- **Fase 4 — iOS premium**
  App nativo com ARKit / RoomPlan + [MetalSplatter](https://github.com/scier/MetalSplatter)
  para renderização nativa em iPhones Pro com LiDAR.

---

## 9. Segurança

- Todas as tabelas têm **RLS** habilitado.
- Usuário autenticado só vê/edita os próprios spaces.
- Visitantes acessam apenas spaces com `is_public=true` **e** `status='completed'`.
- `SUPABASE_SERVICE_ROLE_KEY` é usada apenas no worker local
  (`scripts/render.ts`) e nas migrações — nunca exposta ao client.
