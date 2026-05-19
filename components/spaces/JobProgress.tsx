"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { ProcessingJob } from "@/types/space";

export default function JobProgress({
  initialJob,
}: {
  initialJob: ProcessingJob;
}) {
  const router = useRouter();
  const [job, setJob] = useState<ProcessingJob>(initialJob);

  useEffect(() => {
    if (job.status === "completed" || job.status === "failed") return;
    const supabase = createClient();

    const channel = supabase
      .channel(`job-${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "processing_jobs",
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          const next = payload.new as ProcessingJob;
          setJob(next);
          if (next.status === "completed" || next.status === "failed") {
            router.refresh();
          }
        },
      )
      .subscribe();

    // Fallback: polling de baixa frequência caso o realtime não esteja ativo.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("processing_jobs")
        .select("*")
        .eq("id", job.id)
        .single();
      if (data) {
        setJob(data as ProcessingJob);
        if (data.status === "completed" || data.status === "failed") {
          router.refresh();
        }
      }
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [job.id, job.status, router]);

  const steps = [
    { key: "queued", label: "Aguardando processamento" },
    { key: "processing", label: "Gerando ambiente 3D" },
    { key: "completed", label: "Pronto" },
  ];
  const currentIndex =
    job.status === "completed"
      ? 2
      : job.status === "processing"
        ? 1
        : job.status === "failed"
          ? -1
          : 0;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Processamento</h3>
        <span className="text-xs text-muted">{job.progress}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded overflow-hidden">
        <div
          className={`h-full transition-all ${
            job.status === "failed" ? "bg-rose-500" : "bg-primary"
          }`}
          style={{ width: `${job.progress}%` }}
        />
      </div>
      <ul className="text-sm space-y-1">
        {steps.map((s, i) => (
          <li
            key={s.key}
            className={
              i <= currentIndex
                ? "text-foreground"
                : "text-muted"
            }
          >
            {i < currentIndex ? "✓ " : i === currentIndex ? "→ " : "• "}
            {s.label}
          </li>
        ))}
        {job.status === "failed" && (
          <li className="text-rose-400">
            ✗ Falhou: {job.error_message ?? "erro desconhecido"}
          </li>
        )}
      </ul>
    </div>
  );
}
