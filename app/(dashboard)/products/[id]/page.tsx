import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatBytes, formatDate, formatPrice } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/presets";
import ProductStatusBadge from "@/components/products/ProductStatusBadge";
import GlbUploader from "@/components/products/GlbUploader";
import PublishToggle from "@/components/products/PublishToggle";
import QRGenerator from "@/components/products/QRGenerator";
import type { Product } from "@/types/product";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!data) notFound();
  const product = data as Product;

  const arUrl =
    product.public_slug && product.status === "ready" && product.is_public
      ? `${env.APP_URL}/ar/${product.public_slug}`
      : null;

  let markerSignedUrl: string | null = null;
  if (product.marker_path) {
    const { data: signed } = await supabase.storage
      .from(env.SUPABASE_BUCKET)
      .createSignedUrl(product.marker_path, 3600);
    markerSignedUrl = signed?.signedUrl ?? null;
  }

  const hasModel = !!product.model_url;
  const hasQR = !!product.marker_url && !!product.mind_file_url;
  const isPublished = product.status === "ready";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/products"
          className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1"
        >
          ← Meus produtos
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <ProductStatusBadge status={product.status} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted flex-wrap">
            <span>{CATEGORY_LABELS[product.category] ?? "—"}</span>
            {product.size_label && (
              <>
                <span>·</span>
                <span>Tamanho {product.size_label}</span>
              </>
            )}
            {product.price_cents != null && (
              <>
                <span>·</span>
                <span className="text-primary font-medium">
                  {formatPrice(product.price_cents, product.currency)}
                </span>
              </>
            )}
          </div>
        </div>
        <Link
          href={`/products/${id}/edit`}
          className="btn btn-secondary text-sm"
        >
          Editar dados
        </Link>
      </header>

      <FlowProgress
        hasModel={hasModel}
        hasQR={hasQR}
        isPublished={isPublished}
      />

      <section className="space-y-2">
        <StepHeader
          number={2}
          state={hasModel ? "done" : "current"}
          title="Modelo 3D"
          subtitle="Arquivo .glb que vai aparecer flutuando em cima do QR."
        />
        <div className="card p-5 sm:p-6 space-y-4">
          {product.model_url && (
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Modelo enviado</span>
              <span className="text-muted">
                · {formatBytes(product.model_size_bytes)}
              </span>
            </div>
          )}
          <GlbUploader
            productId={id}
            userId={user.id}
            currentModelUrl={product.model_url}
          />
        </div>
      </section>

      <section className="space-y-2">
        <StepHeader
          number={3}
          state={hasQR ? "done" : hasModel ? "current" : "todo"}
          title="QR Code"
          subtitle="Imprima e cole no produto físico. Cada QR é único."
        />
        <div className="card p-5 sm:p-6 space-y-4">
          <QRGenerator
            productId={id}
            userId={user.id}
            publicSlug={product.public_slug ?? ""}
            status={product.status}
            hasModel={!!product.model_url}
            markerUrl={markerSignedUrl}
            mindFileUrl={product.mind_file_url}
            productName={product.name}
          />
        </div>
      </section>

      <section className="space-y-2">
        <StepHeader
          number={4}
          state={isPublished ? "done" : hasQR ? "current" : "todo"}
          title="Publicação"
          subtitle="Quando publicado, qualquer pessoa com o QR vê o produto em AR."
        />
        <div className="card p-5 sm:p-6 space-y-4">
          {isPublished && arUrl && (
            <div className="space-y-1">
              <p className="text-xs text-muted">URL pública AR:</p>
              <code className="block text-xs bg-background border border-border rounded px-3 py-2 truncate">
                {arUrl}
              </code>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {isPublished
                ? "Despublicar oculta a página AR. O QR continua salvo."
                : "Publique para ativar o link público do QR."}
            </p>
            <PublishToggle
              productId={id}
              status={product.status}
              canPublish={!!product.model_url}
            />
          </div>
        </div>
      </section>

      <p className="text-xs text-muted text-center pt-4">
        Criado em {formatDate(product.created_at)}
      </p>
    </div>
  );
}

type StepState = "done" | "current" | "todo";

function FlowProgress({
  hasModel,
  hasQR,
  isPublished,
}: {
  hasModel: boolean;
  hasQR: boolean;
  isPublished: boolean;
}) {
  const steps: { label: string; state: StepState }[] = [
    { label: "Dados", state: "done" },
    {
      label: "Modelo 3D",
      state: hasModel ? "done" : "current",
    },
    {
      label: "QR Code",
      state: hasQR ? "done" : hasModel ? "current" : "todo",
    },
    {
      label: "Publicado",
      state: isPublished ? "done" : hasQR ? "current" : "todo",
    },
  ];

  return (
    <div className="card p-4 sm:p-5">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 sm:gap-3 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="step-dot" data-state={s.state}>
                {s.state === "done" ? (
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="5 12 10 17 19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-xs sm:text-sm font-medium truncate ${
                  s.state === "todo" ? "text-muted" : "text-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  s.state === "done" ? "bg-primary/50" : "bg-border"
                }`}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepHeader({
  number,
  state,
  title,
  subtitle,
}: {
  number: number;
  state: StepState;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 px-1">
      <span className="step-dot" data-state={state}>
        {state === "done" ? (
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="5 12 10 17 19 7" />
          </svg>
        ) : (
          number
        )}
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold leading-tight">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
