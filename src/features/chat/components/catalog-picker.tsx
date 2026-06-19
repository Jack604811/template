"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLinkIcon,
  Loader2Icon,
  PackageIcon,
  SearchIcon,
  ShoppingBagIcon,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTRPC } from "@/trpc/client";

type Product = {
  id: string;
  name: string;
  retailer_id: string;
  price?: string;
  currency?: string;
  description?: string;
  image_url?: string;
};

type Catalog = {
  id: string;
  name: string;
  products: Product[];
};

interface CatalogPickerProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  credentialId: string;
}

export function CatalogPicker({ open, onClose, conversationId, credentialId }: CatalogPickerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null);

  const messagesQueryOptions = trpc.chat.getMessages.queryOptions({ conversationId });

  const { data, isLoading, error } = useQuery({
    ...trpc.credentials.getWhatsAppCatalog.queryOptions({ credentialId }),
    enabled: open,
    staleTime: 60_000,
  });

  const sendCatalog = useMutation(trpc.chat.sendCatalogMessage.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesQueryOptions.queryKey });
      onClose();
    },
  }));

  const catalogs = data?.catalogs ?? [];
  const current = activeCatalog ?? (catalogs.length === 1 ? (catalogs[0] ?? null) : null);

  const filteredProducts = useMemo(() => {
    if (!current) return [];
    const q = search.toLowerCase();
    return current.products.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.retailer_id.toLowerCase().includes(q),
    );
  }, [current, search]);

  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose();
      setActiveCatalog(null);
      setSearch("");
    }
  }

  const isPending = sendCatalog.isPending;
  const title = current ? current.name : "Catálogo";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">Selecciona productos del catálogo para enviar</DialogDescription>
      <DialogContent title={title} showCloseButton className="flex flex-col gap-0 p-0 sm:max-w-lg overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="py-8 px-5 text-center text-sm text-destructive">{error.message}</p>
        ) : !current ? (
          /* Catalog selection / empty */
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4">
              {catalogs.length === 0 ? (
                <Empty className="border-none">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ShoppingBagIcon />
                    </EmptyMedia>
                    <EmptyTitle>Sin catálogos</EmptyTitle>
                    <EmptyDescription>
                      Crea y vincula un catálogo a tu cuenta de WhatsApp Business en Commerce Manager.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://business.facebook.com/commerce/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir Commerce Manager
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </Button>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {catalogs.map((catalog) => (
                    <button
                      key={catalog.id}
                      type="button"
                      onClick={() => setActiveCatalog(catalog)}
                      className="flex items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <ShoppingBagIcon className="size-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{catalog.name}</p>
                        <p className="text-xs text-muted-foreground">{catalog.products.length} productos</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          /* Product list */
          <div className="flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="pl-9"
                />
              </div>
              <Button
                size="sm"
                disabled={isPending}
                onClick={() =>
                  sendCatalog.mutate({
                    conversationId,
                    type: "catalog",
                    catalogId: current.id,
                    productRetailerId: current.products[0]?.retailer_id,
                  })
                }
                className="shrink-0 rounded-full"
              >
                {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <ShoppingBagIcon className="size-3.5" />}
                Enviar catálogo
              </Button>
            </div>

            <ScrollArea className="max-h-[55vh]">
              <div className="px-4 pb-4">
                {filteredProducts.length === 0 && !search ? (
                  <Empty className="border-none">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PackageIcon />
                      </EmptyMedia>
                      <EmptyTitle>Catálogo vacío</EmptyTitle>
                      <EmptyDescription>
                        Añade productos a este catálogo desde Commerce Manager.
                      </EmptyDescription>
                    </EmptyHeader>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href="https://business.facebook.com/commerce/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Añadir productos
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </Button>
                  </Empty>
                ) : filteredProducts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados.</p>
                ) : (
                  <div className="flex flex-col gap-2 pb-1">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          sendCatalog.mutate({
                            conversationId,
                            type: "product",
                            catalogId: current.id,
                            productRetailerId: product.retailer_id,
                          })
                        }
                        className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                      >
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            width={56}
                            height={56}
                            className="size-14 shrink-0 rounded-xl object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <PackageIcon className="size-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{product.name}</p>
                          {product.price && (
                            <p className="mt-0.5 text-[12px] font-medium text-primary">
                              {product.currency ? `${product.currency} ` : ""}{product.price}
                            </p>
                          )}
                          {product.description && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground/60">SKU: {product.retailer_id}</p>
                        </div>
                        {isPending && <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
