"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCategory } from "@/types/database";
import { productSchema } from "@/lib/validators";
import { formatPrice, parsePriceToCents } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SIZE_OPTIONS,
  DEFAULT_MARKER_WIDTH_CM,
  getPresetDims,
} from "@/lib/presets";

interface Props {
  mode: "create" | "edit";
  initial?: {
    id?: string;
    name?: string;
    description?: string | null;
    price_cents?: number | null;
    currency?: string;
    category?: ProductCategory;
    size_label?: string | null;
    dim_length_cm?: number | null;
    dim_width_cm?: number | null;
    dim_height_cm?: number | null;
    marker_width_cm?: number;
    is_public?: boolean;
  };
}

const STEPS = [
  { id: 1, title: "Identidade", hint: "Nome e categoria" },
  { id: 2, title: "Tamanho real", hint: "Dimensões físicas" },
  { id: 3, title: "Preço & publicação", hint: "Detalhes finais" },
];

function dimToString(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

function parseDim(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ProductForm({ mode, initial }: Props) {
  const router = useRouter();
  const isWizard = mode === "create";

  const [step, setStep] = useState(1);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceInput, setPriceInput] = useState(
    initial?.price_cents != null
      ? formatPrice(initial.price_cents, initial.currency ?? "BRL")
      : "",
  );
  const [category, setCategory] = useState<ProductCategory>(
    initial?.category ?? "custom",
  );
  const [sizeLabel, setSizeLabel] = useState(initial?.size_label ?? "");
  const [dimL, setDimL] = useState(dimToString(initial?.dim_length_cm));
  const [dimW, setDimW] = useState(dimToString(initial?.dim_width_cm));
  const [dimH, setDimH] = useState(dimToString(initial?.dim_height_cm));
  const [markerCm, setMarkerCm] = useState(
    String(initial?.marker_width_cm ?? DEFAULT_MARKER_WIDTH_CM),
  );
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function applyPresetFor(newCategory: ProductCategory, newSize: string) {
    const preset = getPresetDims(newCategory, newSize);
    if (preset) {
      setDimL(String(preset.length_cm));
      setDimW(String(preset.width_cm));
      setDimH(String(preset.height_cm));
    }
  }

  function handleCategoryChange(next: ProductCategory) {
    setCategory(next);
    if (!SIZE_OPTIONS[next].includes(sizeLabel)) {
      setSizeLabel("");
    }
  }

  function handleSizeChange(next: string) {
    setSizeLabel(next);
    if (next) applyPresetFor(category, next);
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!name.trim()) return "Digite o nome do produto.";
      if (name.trim().length < 2) return "Nome muito curto.";
    }
    if (s === 2) {
      // dimensoes sao opcionais, mas se preencher uma, recomendamos as 3
      // Aqui sem hard-block — a estimativa cai pro default de 60% do QR.
    }
    return null;
  }

  function goNext() {
    const e = validateStep(step);
    if (e) {
      setError(e);
      return;
    }
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price_cents = parsePriceToCents(priceInput);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price_cents,
      currency: "BRL",
      category,
      size_label: sizeLabel.trim() || null,
      dim_length_cm: parseDim(dimL),
      dim_width_cm: parseDim(dimW),
      dim_height_cm: parseDim(dimH),
      marker_width_cm: parseDim(markerCm) ?? DEFAULT_MARKER_WIDTH_CM,
      is_public: isPublic,
    };
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    const url =
      mode === "create" ? "/api/products" : `/api/products/${initial?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erro ao salvar");
      return;
    }

    const data = await res.json();
    router.replace(`/products/${data.id ?? initial?.id}`);
    router.refresh();
  }

  const sizes = SIZE_OPTIONS[category];
  const showSizeSelect = sizes.length > 0;

  // -------- Campos reutilizáveis --------

  const fieldName = (
    <Field label="Nome do produto" htmlFor="name">
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Tênis Nike Air Max 90"
        required
        maxLength={120}
      />
      <Hint>Aparece no QR e na página AR do cliente.</Hint>
    </Field>
  );

  const fieldCategory = (
    <Field label="Categoria" htmlFor="category">
      <select
        id="category"
        value={category}
        onChange={(e) =>
          handleCategoryChange(e.target.value as ProductCategory)
        }
      >
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <Hint>
        Define os tamanhos disponíveis no próximo passo. Use “Outro” para itens
        sem padrão.
      </Hint>
    </Field>
  );

  const fieldDescription = (
    <Field label="Descrição (opcional)" htmlFor="description">
      <textarea
        id="description"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Detalhes do produto, material, observações..."
        maxLength={2000}
      />
    </Field>
  );

  const fieldSize = showSizeSelect ? (
    <Field label="Tamanho" htmlFor="size">
      <select
        id="size"
        value={sizeLabel}
        onChange={(e) => handleSizeChange(e.target.value)}
      >
        <option value="">— escolha —</option>
        {sizes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Hint>Escolher um tamanho auto-preenche as medidas abaixo.</Hint>
    </Field>
  ) : (
    <Field label="Tamanho (opcional)" htmlFor="size-free">
      <input
        id="size-free"
        type="text"
        value={sizeLabel}
        onChange={(e) => setSizeLabel(e.target.value)}
        placeholder="Ex.: 42mm, único"
        maxLength={40}
      />
    </Field>
  );

  const fieldDims = (
    <Field label="Medidas físicas reais (cm)">
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={dimL}
          onChange={(e) => setDimL(e.target.value)}
          placeholder="Comprimento"
          aria-label="Comprimento em cm"
        />
        <input
          type="text"
          inputMode="decimal"
          value={dimW}
          onChange={(e) => setDimW(e.target.value)}
          placeholder="Largura"
          aria-label="Largura em cm"
        />
        <input
          type="text"
          inputMode="decimal"
          value={dimH}
          onChange={(e) => setDimH(e.target.value)}
          placeholder="Altura"
          aria-label="Altura em cm"
        />
      </div>
      <Hint>
        Use o tamanho real do produto. Se deixar vazio, o modelo é escalado para
        ~60% da largura do QR.
      </Hint>
    </Field>
  );

  const fieldMarker = (
    <Field label="Largura do QR impresso (cm)" htmlFor="marker">
      <input
        id="marker"
        type="text"
        inputMode="decimal"
        value={markerCm}
        onChange={(e) => setMarkerCm(e.target.value)}
        placeholder="10"
      />
      <Hint>
        Tamanho em que você vai imprimir o QR. Padrão 10 cm. Influencia o
        tamanho real do modelo em AR.
      </Hint>
    </Field>
  );

  const fieldPrice = (
    <Field label="Preço (opcional)" htmlFor="price">
      <input
        id="price"
        type="text"
        inputMode="decimal"
        value={priceInput}
        onChange={(e) => setPriceInput(e.target.value)}
        placeholder="R$ 0,00"
      />
      <Hint>Mostrado como overlay flutuante na experiência AR.</Hint>
    </Field>
  );

  const fieldPublic = (
    <label className="flex items-start gap-2.5 text-sm cursor-pointer p-3 rounded-lg border border-border hover:bg-card-hover transition-colors">
      <input
        type="checkbox"
        checked={isPublic}
        onChange={(e) => setIsPublic(e.target.checked)}
        className="w-auto mt-0.5"
      />
      <span className="space-y-0.5">
        <span className="block font-medium">Tornar acessível pelo QR público</span>
        <span className="block text-xs text-muted">
          Quando publicado, qualquer pessoa com o QR vê o produto em AR. Você pode
          despublicar a qualquer momento.
        </span>
      </span>
    </label>
  );

  // -------- Modo edição (formulário plano, sem wizard) --------
  if (!isWizard) {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        {fieldName}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fieldCategory}
          {fieldSize}
        </div>
        {fieldDims}
        {fieldMarker}
        {fieldPrice}
        {fieldDescription}
        {fieldPublic}

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-ghost"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  // -------- Modo wizard (criação) --------
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <StepProgress current={step} />

      {step === 1 && (
        <StepCard
          title="Identidade do produto"
          subtitle="O básico — como o produto se chama e em que categoria se encaixa."
        >
          {fieldName}
          {fieldCategory}
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          title="Tamanho real"
          subtitle="Essas medidas são usadas para escalar o modelo 3D ao tamanho real em cima do QR."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="opacity-70 pointer-events-none">
              <Field label="Categoria" htmlFor="cat-readonly">
                <input
                  id="cat-readonly"
                  type="text"
                  value={CATEGORY_LABELS[category]}
                  readOnly
                />
              </Field>
            </div>
            {fieldSize}
          </div>
          {fieldDims}
          {fieldMarker}
        </StepCard>
      )}

      {step === 3 && (
        <StepCard
          title="Preço, descrição e publicação"
          subtitle="Últimos detalhes antes de criar o produto."
        >
          {fieldPrice}
          {fieldDescription}
          {fieldPublic}
        </StepCard>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={step === 1 ? () => router.back() : goBack}
          className="btn btn-ghost"
          disabled={loading}
        >
          {step === 1 ? "Cancelar" : "← Voltar"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="btn btn-primary"
            disabled={loading}
          >
            Continuar →
          </button>
        ) : (
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Criando..." : "Criar produto"}
          </button>
        )}
      </div>

      <p className="text-xs text-muted text-center pt-2">
        Próximo: você vai fazer upload do modelo 3D (.glb), gerar o QR code e
        publicar.
      </p>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2"
      role="alert"
    >
      {children}
    </p>
  );
}

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function StepProgress({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const state =
          s.id < current ? "done" : s.id === current ? "current" : "todo";
        return (
          <li key={s.id} className="flex items-center gap-2 sm:gap-3 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="step-dot"
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
              >
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
                  s.id
                )}
              </span>
              <div className="hidden sm:block min-w-0">
                <p
                  className={`text-xs font-medium leading-tight truncate ${
                    state === "todo" ? "text-muted" : "text-foreground"
                  }`}
                >
                  {s.title}
                </p>
                <p className="text-[11px] text-muted leading-tight truncate">
                  {s.hint}
                </p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  s.id < current ? "bg-primary/50" : "bg-border"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
