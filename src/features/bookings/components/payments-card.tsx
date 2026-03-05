"use client";

import { memo, useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreditCard, Clock, Plus, CalendarIcon, CheckCircle2 } from "lucide-react";
import { formatPrice, formatNumberWithPeriods, getTodayLocalDate, parseFormattedNumber } from "@/lib/utils";
import { paymentMethods } from "@/features/bookings/constants";
import { useSuspenseBooking } from "@/features/bookings/hooks/use-bookings";
import { useCreatePayment, useUpdatePayment } from "@/features/bookings/hooks/use-payments";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Payment } from "@/features/bookings/types";

interface PaymentsCardProps {
  bookingId: string;
  /** When set, the Record Payment dialog is controlled by the parent (e.g. opened from Checkout card). */
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  /** When dialog is opened from parent (e.g. clicking a payment row in Checkout), pre-fill form to edit this payment. */
  editingPaymentWhenOpened?: Payment | null;
}

interface PaymentFormData {
  amount: string;
  method: string;
  date: string;
  notes: string;
}

export const PaymentsCard = memo(({ bookingId, dialogOpen, onDialogOpenChange, editingPaymentWhenOpened }: PaymentsCardProps) => {
  const { data: booking } = useSuspenseBooking(bookingId);
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const createPayment = useCreatePayment(bookingId);
  const updatePayment = useUpdatePayment(bookingId);

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = dialogOpen !== undefined && onDialogOpenChange !== undefined;
  const isDialogOpen = isControlled ? dialogOpen : internalOpen;
  const setIsDialogOpen = isControlled ? onDialogOpenChange : setInternalOpen;

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [formData, setFormData] = useState<PaymentFormData>({
    amount: "",
    method: paymentMethods[0].value,
    date: getTodayLocalDate(),
    notes: "",
  });

  // Convert Prisma payments to UI Payment type
  const payments = useMemo(() => {
    if (!booking?.payments) return [];
    return booking.payments.map((p) => ({
      id: p.id,
      method: p.method || "Cash",
      amount: p.amount,
      date: p.date
        ? new Date(p.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : new Date().toLocaleDateString(),
      status: p.status === "completed" ? "completed" : "pending",
      type: "Payment",
    }));
  }, [booking?.payments]);

  const totalCollected = useMemo(
    () => payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );

  // When dialog is opened from Checkout card (controlled), either reset for new payment or pre-fill for edit
  useEffect(() => {
    if (!isControlled || !isDialogOpen) return;

    if (editingPaymentWhenOpened) {
      setEditingPaymentId(editingPaymentWhenOpened.id.toString());
      const actualPayment = booking?.payments.find((p) => p.id === editingPaymentWhenOpened.id);
      const paymentDate = actualPayment?.date ? new Date(actualPayment.date) : new Date(editingPaymentWhenOpened.date);
      const dateString = paymentDate.toISOString().split("T")[0];
      setFormData({
        amount: formatNumberWithPeriods(editingPaymentWhenOpened.amount.toString()),
        method: editingPaymentWhenOpened.method,
        date: dateString,
        notes: actualPayment?.notes ?? "",
      });
    } else {
      setEditingPaymentId(null);
      setFormData({
        amount: "",
        method: paymentMethods[0].value,
        date: getTodayLocalDate(),
        notes: "",
      });
    }
  }, [isControlled, isDialogOpen, editingPaymentWhenOpened, booking?.payments]);

  const resetForm = useCallback(() => {
    setIsDialogOpen(false);
    setEditingPaymentId(null);
    setDatePickerOpen(false);
    setFormData({
      amount: "",
      method: paymentMethods[0].value,
      date: getTodayLocalDate(),
      notes: "",
    });
  }, [setIsDialogOpen]);

  const handleSubmitPayment = useCallback(async () => {
    if (!formData.amount || !formData.method) return;

    const cleanAmount = parseFormattedNumber(formData.amount);
    const paymentDate = new Date(formData.date + "T00:00:00");

    const queryOptions = trpc.bookings.getOne.queryOptions({ id: bookingId });

    if (editingPaymentId !== null) {
      // Update existing payment with optimistic update
      queryClient.setQueryData(queryOptions.queryKey, (oldData) => {
        if (!oldData) return oldData;

        const updated = { ...oldData };
        updated.payments = oldData.payments.map((p) =>
          p.id === editingPaymentId
            ? {
                ...p,
                method: formData.method,
                amount: cleanAmount,
                date: paymentDate,
                notes: formData.notes || null,
              }
            : p,
        );
        return updated;
      });

      try {
        await updatePayment.mutateAsync({
          id: editingPaymentId,
          method: formData.method,
          amount: cleanAmount,
          date: paymentDate,
          notes: formData.notes || null,
        });
        resetForm();
      } catch {
        // Error handling is done in mutation hook (toast notification)
        // Optimistic update will be reverted by invalidating query
      }
    } else {
      // Create new payment with optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticPayment = {
        id: tempId,
        bookingId,
        method: formData.method,
        amount: cleanAmount,
        date: paymentDate,
        status: "completed" as const,
        notes: formData.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData(queryOptions.queryKey, (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          payments: [...oldData.payments, optimisticPayment],
        };
      });

      try {
        await createPayment.mutateAsync({
          bookingId,
          method: formData.method,
          amount: cleanAmount,
          date: paymentDate,
          status: "completed",
          notes: formData.notes,
        });
        resetForm();
      } catch {
        // Error handling is done in mutation hook (toast notification)
        // Optimistic update will be reverted by invalidating query
      }
    }
  }, [formData, editingPaymentId, bookingId, queryClient, trpc, createPayment, updatePayment, resetForm]);

  const handleEditPayment = useCallback(
    (payment: { id: string | number; amount: number; method: string; date: string; notes?: string | null }) => {
      setEditingPaymentId(payment.id.toString());
      // Find the actual payment from booking to get the real date
      const actualPayment = booking?.payments.find((p) => p.id === payment.id);
      const paymentDate = actualPayment?.date ? new Date(actualPayment.date) : new Date(payment.date);
      const dateString = paymentDate.toISOString().split("T")[0];

      setFormData({
        amount: formatNumberWithPeriods(payment.amount.toString()),
        method: payment.method,
        date: dateString,
        notes: payment.notes || "",
      });
      setIsDialogOpen(true);
    },
    [booking?.payments, setIsDialogOpen],
  );

  return (
    <>
      {!isControlled && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Payments</CardTitle>
              <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No payments recorded yet</p>
                <p className="text-xs text-muted-foreground mb-4">Record a payment or send a payment link</p>
                <Button variant="outline" size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
              </div>
            ) : (
              <>
                {payments.map((payment, index) => (
                  <div key={payment.id}>
                    <button
                      type="button"
                      className="flex items-center justify-between gap-4 cursor-pointer hover:opacity-80 transition-opacity w-full bg-transparent border-none p-0 text-left"
                      onClick={() => handleEditPayment(payment)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            payment.status === "completed" ? "bg-accent/10" : "bg-muted"
                          }`}
                        >
                          {payment.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-accent" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{payment.type}</p>
                            <Badge
                              variant={payment.status === "completed" ? "outline" : "secondary"}
                              className={`text-xs ${payment.status === "completed" ? "text-accent border-accent/30" : ""}`}
                            >
                              {payment.status === "completed" ? "Paid" : "Due"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{payment.method}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${formatPrice(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">{payment.date}</p>
                      </div>
                    </button>
                    {index < payments.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}

                <Separator />

                <div className="flex items-center pt-2 justify-end">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Collected</p>
                    <p className="text-lg font-bold text-primary">${formatPrice(totalCollected)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-xl">
              {editingPaymentId !== null ? "Edit Payment" : "Record Manual Payment"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingPaymentId !== null
                ? "Update the payment details below."
                : "Enter the payment details below. All fields marked with an asterisk (*) are required."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-0">
            <div className="space-y-3">
              <Label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
                Amount *
              </Label>
              <div className="flex">
                <span className="text-4xl font-bold text-muted-foreground">$</span>
                <input
                  id="amount"
                  type="text"
                  placeholder="0"
                  className="text-4xl text-primary font-bold border-none outline-none focus:outline-none focus:ring-0 w-full bg-background"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: formatNumberWithPeriods(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="method" className="text-sm font-medium text-muted-foreground">
                Payment Method *
              </Label>
              <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                <SelectTrigger className="w-full h-auto py-6 px-0 border-0 shadow-none">
                  {formData.method ? (
                    <div className="flex items-center gap-3 w-full">
                      {paymentMethods.map((method) => {
                        if (method.value === formData.method) {
                          const Icon = method.icon;
                          return (
                            <div key={method.value} className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted border shrink-0">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col items-start text-left">
                                <span className="font-medium text-sm">{method.label}</span>
                                <span className="text-xs text-muted-foreground">{method.description}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select payment method</span>
                  )}
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectGroup>
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <SelectItem key={method.value} value={method.value} className="cursor-pointer h-auto py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted border shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-sm">{method.label}</span>
                              <span className="text-xs text-muted-foreground">{method.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="date" className="text-sm font-medium text-muted-foreground">
                Payment Date *
              </Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-auto py-0 px-0 border-0 shadow-none justify-start font-normal hover:bg-transparent hover:text-inherit cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted border shrink-0">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium text-sm">
                          {formData.date
                            ? new Date(formData.date + "T00:00:00").toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Select date"}
                        </span>
                        <span className="text-xs text-muted-foreground">Click to change payment date</span>
                      </div>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date ? new Date(formData.date + "T00:00:00") : undefined}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const day = String(date.getDate()).padStart(2, "0");
                        setFormData({ ...formData, date: `${year}-${month}-${day}` });
                        setDatePickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any relevant details about this payment..."
                className="min-h-[100px] resize-none text-sm bg-muted"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Include reference numbers, transaction IDs, or other relevant information
              </p>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetForm} className="h-10 bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={!formData.amount || !formData.method}
              className="h-10 min-w-[140px]"
            >
              {editingPaymentId !== null ? "Update Payment" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

PaymentsCard.displayName = "PaymentsCard";

