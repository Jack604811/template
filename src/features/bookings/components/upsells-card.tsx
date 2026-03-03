"use client";

import type React from "react";
import { memo, useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Gift, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { availableUpsells } from "@/features/bookings/constants";
import type { Upsell } from "@/features/bookings/types";

export const UpsellsCard = memo(({ onUpsellsChange }: { onUpsellsChange?: (total: number) => void }) => {
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const currentOrg = useCurrentOrganizationWithSettings();
  const currency = currentOrg?.currency || "USD";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<number | string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");

  const totalPrice = useMemo(() => upsells.reduce((sum, upsell) => sum + upsell.price, 0), [upsells]);

  const filteredUpsells = useMemo(
    () =>
      availableUpsells.filter(
        (upsell) =>
          upsell.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          upsell.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const resetForm = useCallback(() => {
    setIsDialogOpen(false);
    setShowCustomForm(false);
    setSearchQuery("");
    setCustomName("");
    setCustomDescription("");
    setCustomPrice("");
  }, []);

  const handleRemoveUpsell = useCallback(
    (id: number | string) => {
      setUpsells((prev) => prev.filter((upsell) => upsell.id !== id));
    },
    [],
  );

  const handleAddUpsell = useCallback(() => {
    setIsDialogOpen(true);
    setShowCustomForm(false);
  }, []);

  const handleSelectFromCatalog = useCallback(
    (upsellData: Omit<Upsell, "id" | "status">) => {
      const newUpsell: Upsell = {
        id: Date.now(),
        name: upsellData.name,
        description: upsellData.description,
        price: upsellData.price,
        status: "pending" as const,
        icon: upsellData.icon,
      };
      setUpsells((prev) => [...prev, newUpsell]);
      resetForm();
    },
    [resetForm],
  );

  const handleCustomClick = useCallback(() => {
    setShowCustomForm(true);
  }, []);

  const handleAddCustomUpsell = useCallback(() => {
    if (customName && customPrice) {
      const newUpsell = {
        id: Date.now(),
        name: customName,
        description: customDescription,
        price: Number.parseFloat(customPrice),
        status: "pending" as const,
        icon: Gift,
      };
      setUpsells((prev) => [...prev, newUpsell]);
      resetForm();
    }
  }, [customName, customDescription, customPrice, resetForm]);

  const handlePriceClick = useCallback((id: number | string, currentPrice: number) => {
    setEditingPriceId(id);
    setEditingPriceValue(currentPrice.toString());
  }, []);

  const handlePriceChange = useCallback((value: string) => {
    // Only allow numbers
    if (value === "" || /^\d+$/.test(value)) {
      setEditingPriceValue(value);
    }
  }, []);

  const handlePriceBlur = useCallback(() => {
    if (editingPriceId !== null && editingPriceValue) {
      const newPrice = Number.parseFloat(editingPriceValue);
      setUpsells((prev) => prev.map((upsell) => (upsell.id === editingPriceId ? { ...upsell, price: newPrice } : upsell)));
    }
    setEditingPriceId(null);
    setEditingPriceValue("");
  }, [editingPriceId, editingPriceValue]);

  const handlePriceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handlePriceBlur();
      } else if (e.key === "Escape") {
        setEditingPriceId(null);
        setEditingPriceValue("");
      }
    },
    [handlePriceBlur],
  );

  useEffect(() => {
    onUpsellsChange?.(totalPrice);
  }, [totalPrice, onUpsellsChange]);

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Upsells & Add-ons</CardTitle>
            <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={handleAddUpsell}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {upsells.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No upsells added yet</p>
              <p className="text-xs text-muted-foreground mb-4">Add items to enhance the booking experience</p>
              <Button variant="outline" size="sm" onClick={handleAddUpsell}>
                <Plus className="h-4 w-4 mr-1" />
                Add Upsell
              </Button>
            </div>
          ) : (
            <>
              {upsells.map((upsell, index) => (
                <div key={upsell.id}>
                  <div className="flex items-start gap-4 py-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <upsell.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{upsell.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {editingPriceId === upsell.id ? (
                            <input
                              type="text"
                              value={editingPriceValue}
                              onChange={(e) => handlePriceChange(e.target.value)}
                              onBlur={handlePriceBlur}
                              onKeyDown={handlePriceKeyDown}
                              className="text-sm font-semibold bg-transparent border-none outline-none focus:ring-0 text-right w-24"
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-sm font-semibold cursor-pointer hover:text-foreground/80 transition-colors bg-transparent border-none p-0"
                              onClick={() => handlePriceClick(upsell.id, upsell.price)}
                            >
                              {formatCurrency(upsell.price, currency)}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{upsell.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:bg-transparent"
                      onClick={() => handleRemoveUpsell(upsell.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  {index < upsells.length - 1 && <Separator className="mt-2" />}
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">Total Add-ons</span>
                <span className="text-lg font-bold">{formatCurrency(totalPrice, currency)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col space-y-4">
          <DialogHeader>
            <DialogTitle>Add Upsell</DialogTitle>
            <DialogDescription>
              {showCustomForm ? "Create a custom upsell" : "Select an upsell from the catalog or create custom"}
            </DialogDescription>
          </DialogHeader>

          {!showCustomForm ? (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search upsells..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={handleCustomClick}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card transition-colors text-left group"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors">
                      <Plus className="h-6 w-6 text-foreground" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">Custom Upsell</p>
                        <Badge variant="secondary" className="shrink-0 font-bold">
                          Custom
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Create your own custom upsell with name, description, and price
                      </p>
                    </div>
                  </button>

                  {filteredUpsells.map((upsell) => {
                    const Icon = upsell.icon;
                    return (
                      <button
                        type="button"
                        key={upsell.name}
                        onClick={() => handleSelectFromCatalog(upsell)}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card transition-colors text-left group"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors">
                          <Icon className="h-6 w-6 text-foreground" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm">{upsell.name}</p>
                            <Badge variant="secondary" className="shrink-0 font-bold">
                              {formatCurrency(upsell.price, currency)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{upsell.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {filteredUpsells.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">No upsells found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 pb-2">
                <div className="space-y-2">
                  <Label htmlFor="custom-name">Upsell Name *</Label>
                  <Input
                    id="custom-name"
                    placeholder="e.g., Premium Breakfast Package"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-description">Description</Label>
                  <Textarea
                    id="custom-description"
                    placeholder="Describe what's included in this upsell..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-price">Price (COP) *</Label>
                  <Input
                    id="custom-price"
                    type="number"
                    placeholder="0"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    min="0"
                    step="1000"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCustomForm(false)}>
                    Back
                  </Button>
                  <Button onClick={handleAddCustomUpsell} disabled={!customName || !customPrice}>
                    Add Custom Upsell
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

UpsellsCard.displayName = "UpsellsCard";

