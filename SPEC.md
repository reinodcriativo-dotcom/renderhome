App de Captura e Visualização 3D de Imóveis
1. Nome temporário do produto

RenderEstate 3D

Nome pode ser alterado depois.

2. Visão geral

Criar um aplicativo web/mobile-first para captura, processamento, organização e visualização de ambientes 3D de imóveis.

O usuário poderá criar uma conta com login e senha, criar espaços/imóveis, gravar ou enviar vídeos/imagens de um ambiente, acompanhar o processamento e receber um link público para visualizar o ambiente em 3D.

No início, o aplicativo não precisa de confirmação de e-mail.

A primeira versão deve funcionar em qualquer celular, então a captura principal será baseada em vídeo/fotos, não em LiDAR obrigatório. Em iPhones Pro com LiDAR, suporte avançado poderá ser adicionado depois.

3. Objetivo do MVP

Permitir que um usuário:

Crie conta com e-mail e senha.
Faça login.
Veja sua área privada.
Crie espaços/imóveis.
Grave ou envie vídeo/fotos de um ambiente.
Aguarde a geração do ambiente 3D.
Receba um link para visualizar o ambiente 3D.
Edite nome, descrição e tags do ambiente.
Compartilhe o link público de visualização.
4. Repositórios e tecnologias de referência
Visualização 3D no iOS

Usar como referência:

MetalSplatter
GitHub: https://github.com/scier/MetalSplatter

MetalSplatter é uma biblioteca Swift/Metal para renderizar Gaussian Splats em plataformas Apple, incluindo iOS, macOS e visionOS. Ela carrega arquivos .PLY, .SPZ e .splat.

Observação: MetalSplatter é excelente para iPhone/iPad, mas não resolve Android.

Backend/processamento 3D

Usar como referência:

graphdeco-inria/gaussian-splatting
GitHub: https://github.com/graphdeco-inria/gaussian-splatting

Esse é o repositório original de referência do 3D Gaussian Splatting. A técnica permite síntese de novas vistas em tempo real com alta qualidade visual.

nerfstudio-project/gsplat
GitHub: https://github.com/nerfstudio-project/gsplat

gsplat é uma biblioteca open-source focada em Gaussian Splatting, com rasterização acelerada por CUDA e integração com fluxos de pesquisa/desenvolvimento em PyTorch.

Autenticação, banco e storage

Recomendação para MVP:

Supabase

Usar Supabase para:

autenticação com e-mail e senha;
banco PostgreSQL;
storage de vídeos, imagens e arquivos 3D;
Row Level Security para separar dados por usuário.

Supabase é uma plataforma open-source baseada em Postgres e ferramentas abertas, posicionada como alternativa open-source ao Firebase.

5. Estratégia técnica principal

Como o app precisa funcionar em qualquer celular, o MVP não deve depender de LiDAR.

Fluxo recomendado
Usuário grava vídeo ou envia imagens
→ arquivos são enviados para o storage
→ backend cria um job de processamento
→ pipeline 3D gera arquivo .splat, .ply ou .spz
→ app salva o resultado
→ usuário recebe link público para visualizar
Visualização por plataforma
Web / Android
→ viewer WebGL / Three.js / PlayCanvas

iOS
→ viewer WebGL no MVP
→ futuramente MetalSplatter nativo para melhor performance

Para o MVP, priorizar visualizador web, porque ele funciona em iPhone, Android e desktop.

6. Escopo do MVP
Incluído no MVP
Autenticação
Cadastro com e-mail e senha.
Login com e-mail e senha.
Logout.
Sem confirmação de e-mail no começo.
Cada usuário só pode acessar seus próprios espaços.
Dashboard

Tela inicial após login com:

lista de espaços criados;
botão “Criar novo espaço”;
status de cada espaço:
rascunho;
enviando;
processando;
pronto;
erro.
Espaços

Cada espaço deve ter:

nome;
descrição;
endereço opcional;
tags;
status;
data de criação;
data de atualização;
arquivos enviados;
link público de visualização;
preview/thumbnail.
Captura/upload

O usuário poderá:

gravar vídeo pelo celular;
enviar vídeo da galeria;
enviar múltiplas imagens;
adicionar os arquivos a um espaço existente;
continuar adicionando novas capturas depois.
Processamento

No MVP, o processamento pode começar como simulado/mockado, mas a arquitetura deve estar preparada para processamento real.

Estados do processamento:

pending
uploading
queued
processing
completed
failed

Quando o processamento terminar, o sistema deve gerar um link de visualização.

Visualizador público

Cada ambiente pronto deve ter um link público:

/app/view/[public_slug]

O visitante não precisa estar logado para visualizar.

O visualizador deve:

abrir o ambiente 3D;
permitir rotacionar;
permitir zoom;
permitir mover a câmera;
mostrar nome do espaço;
mostrar tags públicas, se configurado.
Edição

O usuário poderá editar:

nome do espaço;
descrição;
tags;
visibilidade pública/privada;
thumbnail;
adicionar novas capturas.
7. Fora do escopo inicial

Não incluir no MVP:

confirmação de e-mail;
pagamento/assinatura;
equipe multiusuário;
marketplace;
edição avançada do modelo 3D;
medição precisa de cômodos;
planta baixa automática;
RoomPlan/ARKit nativo;
app nativo separado para iOS/Android;
processamento 3D real completo rodando em produção, caso o custo seja alto.
8. Usuários
Usuário principal

Corretor, fotógrafo imobiliário, arquiteto ou dono de imóvel que deseja criar uma visualização 3D de um ambiente.

Visitante

Pessoa que recebe o link e visualiza o ambiente 3D sem precisar criar conta.

9. Principais telas
9.1 Tela de cadastro

Campos:

nome;
e-mail;
senha;
confirmar senha.

Regras:

senha mínima de 8 caracteres;
e-mail válido;
não exigir confirmação de e-mail no MVP.
9.2 Tela de login

Campos:

e-mail;
senha.

Ações:

entrar;
ir para cadastro;
recuperação de senha pode ficar para versão futura.
9.3 Dashboard

Mostrar cards dos espaços:

[Thumbnail]
Nome do espaço
Status
Tags
Data de criação
Botão: Abrir
Botão: Copiar link

Botões principais:

Criar espaço;
Sair.
9.4 Criar espaço

Campos:

nome do espaço;
descrição;
endereço opcional;
tags.

Após criar, redirecionar para a tela de detalhes do espaço.

9.5 Detalhes do espaço

Mostrar:

nome;
descrição;
tags;
status;
arquivos enviados;
botão para gravar/enviar vídeo;
botão para enviar fotos;
botão para iniciar processamento;
link público se estiver pronto;
botão copiar link;
botão editar.
9.6 Tela de captura/upload

Funcionalidades:

abrir câmera do celular;
gravar vídeo;
selecionar vídeo da galeria;
selecionar múltiplas imagens;
mostrar progresso de upload;
salvar arquivos no storage.

Instruções para o usuário:

Ande devagar pelo ambiente.
Passe por todos os cantos.
Evite movimentos bruscos.
Capture paredes, chão, teto e objetos principais.
Quanto mais cobertura, melhor será o resultado.
9.7 Tela de processamento

Mostrar status:

Arquivos enviados
Aguardando processamento
Gerando ambiente 3D
Finalizando visualização
Pronto

No MVP, o processamento pode ser simulado com timeout e usar um arquivo 3D de exemplo.

9.8 Visualizador 3D público

Rota:

/view/[slug]

Deve funcionar sem login.

Mostrar:

viewer 3D;
nome do ambiente;
descrição curta;
tags;
botão de tela cheia.

Para o MVP, usar Three.js para renderizar um arquivo de exemplo ou modelo simples. Depois, substituir pelo viewer de Gaussian Splat.

10. Modelo de dados
Tabela profiles
id uuid primary key references auth.users(id)
name text
email text
created_at timestamp
updated_at timestamp
Tabela spaces
id uuid primary key
user_id uuid references auth.users(id)
name text not null
description text
address text
status text not null default 'draft'
public_slug text unique
is_public boolean default true
thumbnail_url text
viewer_url text
created_at timestamp
updated_at timestamp

Status permitidos:

draft
uploading
queued
processing
completed
failed
Tabela space_tags
id uuid primary key
space_id uuid references spaces(id)
tag text not null
created_at timestamp
Tabela space_assets
id uuid primary key
space_id uuid references spaces(id)
user_id uuid references auth.users(id)
type text not null
file_url text not null
file_path text not null
mime_type text
size_bytes bigint
created_at timestamp

Tipos permitidos:

image
video
model
thumbnail
metadata
Tabela processing_jobs
id uuid primary key
space_id uuid references spaces(id)
user_id uuid references auth.users(id)
status text not null default 'queued'
progress integer default 0
error_message text
input_assets jsonb
output_assets jsonb
created_at timestamp
updated_at timestamp
completed_at timestamp

Status permitidos:

queued
processing
completed
failed
11. Permissões e segurança

Usar Row Level Security no Supabase.

Regras:

usuário autenticado só pode ver seus próprios espaços;
usuário autenticado só pode editar seus próprios espaços;
visitante só pode acessar espaços públicos via public_slug;
assets privados não devem ser expostos diretamente;
links públicos devem usar slug único difícil de adivinhar;
não permitir upload de arquivos que não sejam imagem ou vídeo no fluxo de captura.
12. Requisitos funcionais
RF01 — Cadastro

O usuário deve conseguir criar uma conta com nome, e-mail e senha.

RF02 — Login

O usuário deve conseguir entrar com e-mail e senha.

RF03 — Dashboard privado

O usuário deve visualizar somente os próprios espaços.

RF04 — Criar espaço

O usuário deve conseguir criar um novo espaço com nome, descrição e tags.

RF05 — Upload de captura

O usuário deve conseguir enviar vídeo ou imagens para um espaço.

RF06 — Gravar pelo celular

O usuário deve conseguir abrir a câmera e gravar um vídeo diretamente pelo navegador/app.

RF07 — Processar ambiente

O usuário deve conseguir iniciar a geração do ambiente 3D.

RF08 — Status do processamento

O usuário deve visualizar o status do processamento.

RF09 — Link público

Quando o ambiente estiver pronto, o sistema deve gerar um link público.

RF10 — Visualizar 3D

Visitantes devem conseguir abrir o link público e visualizar o ambiente 3D.

RF11 — Editar espaço

O usuário deve conseguir editar nome, descrição, tags e visibilidade.

RF12 — Copiar link

O usuário deve conseguir copiar o link público do ambiente.

13. Requisitos não funcionais
Performance
Dashboard deve carregar em menos de 2 segundos em conexão normal.
Upload deve mostrar progresso.
Viewer 3D deve ter fallback caso o modelo seja pesado.
O app deve ser mobile-first.
Compatibilidade
iPhone Safari.
Android Chrome.
Desktop Chrome.
Desktop Safari.
Escalabilidade
Processamento 3D deve ser assíncrono.
Upload e processamento devem ser separados.
Backend deve permitir workers no futuro.
Segurança
Autenticação obrigatória para dashboard.
Dados separados por usuário.
Storage protegido.
Links públicos sem acesso à área privada.
14. Stack técnica recomendada para Claude Code
Frontend
Next.js
React
TypeScript
Tailwind CSS
Three.js
React Three Fiber
Backend
Next.js API routes ou Supabase Edge Functions
Supabase Auth
Supabase PostgreSQL
Supabase Storage
Processamento 3D futuro
Python
CUDA
gsplat
Gaussian Splatting
Docker worker
Fila de jobs
Viewer
MVP: Three.js / React Three Fiber
Futuro iOS nativo: MetalSplatter
Futuro Web/Android: WebGL Gaussian Splat viewer
15. Estrutura sugerida do projeto
/renderestate-3d
  /app
    /(auth)
      /login
      /register
    /(dashboard)
      /spaces
      /spaces/new
      /spaces/[id]
      /spaces/[id]/edit
      /spaces/[id]/capture
    /view/[slug]
  /components
    /auth
    /spaces
    /upload
    /viewer
    /layout
  /lib
    supabase-client.ts
    supabase-server.ts
    auth.ts
    storage.ts
    validators.ts
  /server
    jobs.ts
    processing.ts
  /types
    database.ts
    space.ts
  /supabase
    migrations
    policies
  /public
    /sample-models
16. User stories
US01 — Criar conta

Como usuário, quero criar uma conta com e-mail e senha para acessar meu ambiente privado.

US02 — Criar espaço

Como usuário, quero criar um espaço para organizar uma captura 3D de um imóvel ou cômodo.

US03 — Enviar captura

Como usuário, quero gravar ou enviar vídeos/imagens para gerar meu ambiente 3D.

US04 — Acompanhar processamento

Como usuário, quero ver o status da geração para saber quando o ambiente estará pronto.

US05 — Compartilhar ambiente

Como usuário, quero receber um link público para enviar para clientes.

US06 — Editar tags

Como usuário, quero adicionar tags como “sala”, “cozinha”, “apartamento”, “alto padrão” para organizar meus ambientes.

US07 — Visualizar sem login

Como visitante, quero abrir o link e ver o ambiente 3D sem criar conta.

17. Critérios de aceite
Cadastro/login
Usuário consegue se cadastrar.
Usuário consegue fazer login.
Usuário consegue sair.
Usuário não vê dados de outros usuários.
Espaços
Usuário consegue criar espaço.
Usuário consegue listar espaços.
Usuário consegue editar espaço.
Usuário consegue adicionar/remover tags.
Upload
Usuário consegue enviar vídeo.
Usuário consegue enviar imagens.
App mostra progresso de upload.
Arquivos ficam associados ao espaço correto.
Processamento
Usuário consegue iniciar processamento.
Status muda para queued.
Status muda para processing.
Status muda para completed ou failed.
Ao completar, o espaço recebe um viewer_url e um public_slug.
Visualização pública
Link público abre sem login.
Link privado bloqueia visualização pública.
Viewer exibe modelo 3D ou placeholder no MVP.
18. Implementação inicial recomendada
Fase 1 — MVP funcional sem processamento real

Criar:

autenticação;
dashboard;
CRUD de espaços;
upload de vídeos/imagens;
jobs de processamento fake;
visualizador com modelo 3D de exemplo;
link público.

Objetivo: validar fluxo do produto.

Fase 2 — Processamento real

Criar worker para:

receber vídeos/imagens;
extrair frames;
gerar dataset;
rodar Gaussian Splatting/gsplat;
gerar .ply, .splat ou .spz;
salvar resultado no storage;
atualizar job como concluído.
Fase 3 — Viewer avançado

Adicionar:

viewer web de Gaussian Splat;
compressão de arquivos;
thumbnails automáticos;
modo tela cheia;
melhor performance mobile.
Fase 4 — iOS premium

Adicionar:

app iOS nativo;
ARKit;
RoomPlan;
MetalSplatter para renderização nativa;
melhor suporte para iPhones Pro com LiDAR.
19. Prompt para colar no Claude Code
Você é um engenheiro full-stack sênior. Crie um MVP chamado RenderEstate 3D usando Next.js, React, TypeScript, Tailwind CSS, Supabase Auth, Supabase PostgreSQL, Supabase Storage e Three.js/React Three Fiber.

Objetivo:
Criar um app mobile-first para usuários criarem ambientes 3D de imóveis. O usuário deve criar conta com e-mail e senha, fazer login, criar espaços, gravar ou enviar vídeos/imagens, iniciar processamento, receber um link público de visualização 3D, editar nome/descrição/tags e compartilhar o ambiente.

Importante:
- No MVP não precisa confirmação de e-mail.
- Cada usuário deve ver somente seus próprios espaços.
- O app deve funcionar em qualquer celular via navegador.
- O processamento 3D real pode ser mockado inicialmente.
- A arquitetura deve estar preparada para futuramente integrar Gaussian Splatting.
- Usar viewer 3D com Three.js/React Three Fiber no MVP.
- Usar um modelo 3D de exemplo enquanto o processamento real não existe.
- Futuramente, considerar integração com:
  - https://github.com/scier/MetalSplatter para viewer iOS nativo.
  - https://github.com/graphdeco-inria/gaussian-splatting para geração 3D.
  - https://github.com/nerfstudio-project/gsplat para backend de Gaussian Splatting.

Crie:
1. Estrutura completa de pastas.
2. Páginas de login e cadastro.
3. Dashboard privado.
4. CRUD de espaços.
5. Upload de vídeo/imagens para Supabase Storage.
6. Tela de captura/upload mobile-first.
7. Tabela de tags.
8. Tabela de assets.
9. Tabela de processing_jobs.
10. Simulação de processamento com status queued, processing, completed e failed.
11. Geração de public_slug.
12. Página pública /view/[slug].
13. Viewer 3D com Three.js/React Three Fiber.
14. Policies RLS do Supabase.
15. Tipos TypeScript.
16. Componentes reutilizáveis.
17. README com instruções de instalação.
18. Arquivo .env.example.
19. Migrações SQL do Supabase.

Requisitos de banco:
Criar tabelas:
- profiles
- spaces
- space_tags
- space_assets
- processing_jobs

Status de space:
- draft
- uploading
- queued
- processing
- completed
- failed

Status de processing_job:
- queued
- processing
- completed
- failed

Regras:
- Usuário autenticado só pode acessar seus próprios dados.
- Página pública só pode acessar spaces com is_public = true e status = completed.
- Upload deve validar tipo de arquivo: image/* e video/*.
- Interface deve ser responsiva e otimizada para celular.
- Código limpo, organizado e pronto para evoluir.