# Sample 3D models

O viewer do MVP carrega o modelo `/sample-models/sample.glb` quando o processamento real
ainda não está disponível.

Como esse arquivo binário não vem versionado, baixe **um** modelo .glb leve e salve aqui
como `sample.glb`. Algumas opções gratuitas:

- Khronos glTF Sample Assets:
  https://github.com/KhronosGroup/glTF-Sample-Assets
  (ex.: `DamagedHelmet.glb`)
- Polycam community models (CC0/CC-BY): https://poly.cam/library
- Sketchfab (filtre por "downloadable" e licenças permissivas):
  https://sketchfab.com/3d-models?features=downloadable

Se o arquivo não existir, o viewer cai automaticamente em uma cena de placeholder
procedural (chão + paredes + alguns objetos coloridos).

> **Quando o pipeline real de Gaussian Splatting estiver no ar**, este diretório
> deixa de ser necessário: cada `space` terá seu próprio `viewer_url` apontando
> para um arquivo .splat/.ply/.spz no Supabase Storage.
