"use client";

import dynamic from "next/dynamic";

const SplatViewer = dynamic(() => import("./SplatViewer"), { ssr: false });

export default function SplatViewerClient(props: { url?: string | null }) {
  return <SplatViewer {...props} />;
}
