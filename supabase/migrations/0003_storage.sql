-- RenderEstate 3D - Configuração do Storage
--
-- Antes de rodar este SQL, crie um bucket chamado "spaces" no painel:
--   Storage -> New bucket -> name=spaces, public=false
--
-- O caminho de cada arquivo segue o padrão:
--   <user_id>/<space_id>/<filename>
--
-- Isso permite que as policies usem o primeiro segmento do path para verificar
-- a posse do arquivo.

-- =============================================
-- storage.objects policies
-- =============================================

drop policy if exists "spaces bucket: owner read" on storage.objects;
create policy "spaces bucket: owner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'spaces'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "spaces bucket: owner insert" on storage.objects;
create policy "spaces bucket: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'spaces'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "spaces bucket: owner update" on storage.objects;
create policy "spaces bucket: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'spaces'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "spaces bucket: owner delete" on storage.objects;
create policy "spaces bucket: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'spaces'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública de arquivos cujo space esteja publicado e com status completed.
-- Estrutura esperada do path: <user_id>/<space_id>/<filename>
drop policy if exists "spaces bucket: public read model/thumb when published" on storage.objects;
create policy "spaces bucket: public read model/thumb when published"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'spaces'
    and exists (
      select 1
      from public.spaces s
      where s.id::text = (storage.foldername(name))[2]
        and s.is_public = true
        and s.status = 'completed'
    )
  );
