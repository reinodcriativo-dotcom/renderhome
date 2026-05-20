/**
 * Layout especifico da rota AR.
 *
 * O <script type="importmap"> ensina o browser a resolver imports "bare"
 * (ex.: from "three", from "three/addons/...") quando o modulo do MindAR
 * e carregado via CDN. Sem isso, o mindar-image-three.prod.js carrega mas
 * falha ao executar porque o browser nao sabe onde achar "three".
 *
 * O Next.js usa script tags normais (nao type=module) no seu runtime, entao
 * o import map abaixo nao colide com nada da stack do framework. O import
 * map e parseado durante o HTML parse (ainda dentro do body), e quando a
 * gente injeta o <script type=module src=mindar...> dinamicamente apos
 * hidratacao, o browser ja conhece os mapeamentos.
 *
 * three/addons/ -> examples/jsm/ porque o alias 'addons' so existe via
 * package.json exports do three, que o browser/CDN nao honra. Os arquivos
 * fisicos vivem em examples/jsm/.
 */
// Three 0.161 e a ultima versao que ainda exporta sRGBEncoding (removido
// no 0.162). O mindar-image-three.prod.js foi compilado contra Three
// antigo e usa essa constante — por isso precisamos pinar aqui.
const importMap = {
  imports: {
    three:
      "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js",
    "three/addons/":
      "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/",
    "three/":
      "https://cdn.jsdelivr.net/npm/three@0.161.0/",
  },
};

export default function ARLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="importmap"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(importMap) }}
      />
      {children}
    </>
  );
}
