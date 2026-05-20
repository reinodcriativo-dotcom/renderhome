import Link from "next/link";
import type { Product } from "@/types/product";
import ProductStatusBadge from "./ProductStatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="card p-4 sm:p-5 flex flex-col gap-3 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-base font-medium truncate">{product.name}</p>
          {product.price_cents != null && (
            <p className="text-sm text-primary font-medium">
              {formatPrice(product.price_cents, product.currency)}
            </p>
          )}
        </div>
        <ProductStatusBadge status={product.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted pt-1">
        <span>{formatDate(product.created_at)}</span>
        <span>
          {product.model_url ? "modelo ok" : "sem modelo"}
        </span>
      </div>
    </Link>
  );
}
