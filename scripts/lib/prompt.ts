import readline from "node:readline";

export async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function pickIndex(
  question: string,
  max: number,
): Promise<number> {
  while (true) {
    const raw = await ask(question);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1 && n <= max) return n - 1;
    console.log(`> Digite um numero entre 1 e ${max}.`);
  }
}
