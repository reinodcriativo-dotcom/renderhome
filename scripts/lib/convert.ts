import fs from "node:fs";
import path from "node:path";
// @ts-expect-error obj2gltf nao publica types
import obj2gltf from "obj2gltf";

/**
 * Converte um .obj texturizado do Meshroom para .glb (binary glTF),
 * formato que o useGLTF do drei carrega nativamente.
 */
export async function objToGlb(objPath: string): Promise<string> {
  const glbPath = path.join(
    path.dirname(objPath),
    path.basename(objPath, ".obj") + ".glb",
  );

  console.log(`  > Convertendo OBJ -> GLB...`);
  const glb = (await obj2gltf(objPath, { binary: true })) as Buffer;
  await fs.promises.writeFile(glbPath, glb);

  const sizeMb = (glb.length / 1024 / 1024).toFixed(1);
  console.log(`  > ${path.basename(glbPath)} gerado (${sizeMb} MB)`);
  return glbPath;
}
