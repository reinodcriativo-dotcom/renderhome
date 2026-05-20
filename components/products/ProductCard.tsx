import Link from "next/link";
import type { Product } from "@/types/product";
import ProductStatusBadge from "./ProductStatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/presets";

export default function ProductCard({ product }: { product: Product }) {
  const hasModel = !!product.model_url;
  const hasQR = !!product.marker_url;

  return (
    <Link
      href={`/products/${product.id}`}
      className="card p-5 flex flex-col gap-4 hover:border-primary/50 hover:bg-card-hover transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-base font-medium truncate group-hover:text-foreground">
            {product.name}
          </p>
          <p className="text-xs text-muted">
            {CATEGORY_LABELS[product.category] ?? "—"}
            {product.size_label ? ` · ${product.size_label}` : ""}
          </p>
        </div>
        <ProductStatusBadge status={product.status} />
      </div>

      {product.price_cents != null && (
        <p className="text-lg text-primary font-semibold tabular-nums">
          {formatPrice(product.price_cents, product.currency)}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 ${
            hasModel ? "text-emerald-400" : "text-muted"
          }`}
          title={hasModel ? "Modelo 3D enviado" : "Sem modelo 3D"}
        >
          <Dot active={hasModel} /> Modelo
        </span>
        <span
          className={`inline-flex items-center gap-1.5 ${
            hasQR ? "text-emerald-400" : "text-muted"
          }`}
          title={hasQR ? "QR gerado" : "Sem QR"}
        >
          <Dot active={hasQR} /> QR
        </span>
      </div>

      <div className="border-t border-border pt-3 text-[11px] text-muted flex items-center justify-between">
        <span>Criado {formatDate(product.created_at)}</span>
        <span className="text-foreground/40 group-hover:text-primary transition-colors">
          →
        </span>
      </div>
    </Link>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        active ? "bg-emerald-400" : "bg-zinc-600"
      }`}
      aria-hidden="true"
    />
  );
}
