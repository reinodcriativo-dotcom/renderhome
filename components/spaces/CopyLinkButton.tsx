"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn btn-secondary text-sm"
    >
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}
