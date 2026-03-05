"use client";

import type React from "react";

import { memo, useState, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, CreditCard } from "lucide-react";
import { formatNumberWithPeriods, parseFormattedNumber } from "@/lib/utils";
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations";
import { formatCurrency } from "@/lib/format-utils";
import type { Payment } from "@/features/bookings/types";

interface CheckoutCardProps {
  basePrice: number;
  upsellsTotal: number;
  tax: number;
  /** Display label for tax line (e.g. "IVA 19%"). When not provided, "Tax" is used. */
  taxLabel?: string;
  discount: number;
  total: number;
  payments: Payment[];
  bookable: string;
  onRecordPayment?: () => void;
  onEditPayment?: (payment: Payment) => void;
}

export const CheckoutCard = memo(
  ({ basePrice, upsellsTotal, tax, taxLabel, discount, total, payments, bookable, onRecordPayment, onEditPayment }: CheckoutCardProps) => {
    const [editedTotal, setEditedTotal] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const currentOrg = useCurrentOrganizationWithSettings();
    const currency = currentOrg?.currency || "USD";

    const calculations = useMemo(() => {
      const finalTotal =
        editedTotal === null || !editedTotal ? total : parseFormattedNumber(editedTotal);

      const adminDiscountAmount = total - finalTotal;
      const adminDiscountPercentage = total > 0 ? (adminDiscountAmount / total) * 100 : 0;
      const hasAdminDiscount = editedTotal !== null && Math.abs(adminDiscountAmount) > 0.01;

      const totalPaid = payments
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = finalTotal - totalPaid;

      return {
        finalTotal,
        adminDiscountAmount,
        adminDiscountPercentage,
        hasAdminDiscount,
        totalPaid,
        balanceDue,
      };
    }, [total, payments, editedTotal]);

    const { finalTotal, adminDiscountAmount, adminDiscountPercentage, hasAdminDiscount, totalPaid, balanceDue } =
      calculations;

  const handleTotalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const cursorPosition = e.target.selectionStart || 0;
    const oldValue = e.target.value;
    const newValue = e.target.value;

    const formattedValue = formatNumberWithPeriods(newValue);

    const periodsBeforeCursorOld = oldValue.slice(0, cursorPosition).split(".").length - 1;
    const periodsBeforeCursorNew = formattedValue.slice(0, cursorPosition).split(".").length - 1;
    const periodDiff = periodsBeforeCursorNew - periodsBeforeCursorOld;

    setEditedTotal(formattedValue);

    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = cursorPosition + periodDiff;
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  }, []);

  const handleTotalBlur = useCallback(() => {
    if (editedTotal !== null && editedTotal.replace(/\./g, "") === "") {
      setEditedTotal(null);
    }
  }, [editedTotal]);

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Checkout Summary</CardTitle>
          {onRecordPayment && (
            <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={onRecordPayment}>
              <Plus className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{bookable}</span>
            <span className="font-medium">{formatCurrency(basePrice, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Add-ons & Upsells</span>
            <span className="font-medium">{formatCurrency(upsellsTotal, currency)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{taxLabel ?? "Tax"}</span>
              <span className="font-medium">{formatCurrency(tax, currency)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium">-{formatCurrency(discount, currency)}</span>
            </div>
          )}
          {hasAdminDiscount && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Admin Discount ({adminDiscountAmount > 0 ? "-" : "+"}
                {Math.abs(adminDiscountPercentage).toFixed(1)}%)
              </span>
              <span className="font-medium">
                {adminDiscountAmount > 0 ? "-" : "+"}
                {formatCurrency(Math.abs(adminDiscountAmount), currency)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payments</p>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No payments recorded yet</p>
              <p className="text-xs text-muted-foreground">Record a payment or send a payment link</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <button
                  type="button"
                  key={payment.id}
                  onClick={() => onEditPayment?.(payment)}
                  className="flex justify-between items-center text-sm w-full text-left border-0 bg-transparent p-0 cursor-pointer"
                >
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5" />
                    {payment.method}
                    {payment.date && (
                      <span className="text-xs">· {payment.date}</span>
                    )}
                  </span>
                  <span className="font-medium">{formatCurrency(payment.amount, currency)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="p-3 rounded-lg border border-accent/20 bg-secondary">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{balanceDue < 0 ? "Credit" : "Amount Due"}</span>
            <span className="text-xl font-bold">
              {balanceDue < 0 ? "-" : ""}
              {formatCurrency(Math.abs(balanceDue), currency)}
            </span>
          </div>
          {totalPaid > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Total paid: {formatCurrency(totalPaid, currency)} of {formatCurrency(finalTotal, currency)}
            </p>
          )}
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium">Total</span>
          <div className="text-right">
            <input
              ref={inputRef}
              type="text"
              className="text-2xl font-bold text-right border-none outline-none focus:outline-none focus:ring-0 bg-transparent px-0"
              value={editedTotal === null ? formatNumberWithPeriods(total.toFixed(0)) : editedTotal}
              onChange={handleTotalChange}
              onBlur={handleTotalBlur}
            />
            <p className="text-xs text-muted-foreground">{currency}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CheckoutCard.displayName = "CheckoutCard";

