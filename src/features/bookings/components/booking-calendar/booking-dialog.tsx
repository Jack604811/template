"use client"

import { memo, useCallback, useEffect, useMemo, useState, useRef } from "react"
import { Calendar as CalendarLine, Trash2 as DeleteBinLine } from "lucide-react"
import { format, isBefore } from "date-fns"
import { addMinutes } from "date-fns"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import z from "zod"

import type { CalendarBooking, BookingColor } from "./types"
import { DefaultEndHour, DefaultStartHour, EndHour, StartHour } from "./constants"
import { durationToMinutes } from "@/features/bookables/lib/timeslot-generator"
import { BOOKING_STATUSES } from "./status-config"
import { validateBookingDateTime } from "@/features/bookings/rules/booking-rules"
import { computeBookableTax } from "@/features/bookings/utils/compute-bookable-tax"
import { useCreateBooking, useUpdateBooking } from "@/features/bookings/hooks/use-bookings"
import { useFindOrCreateCustomer } from "@/features/bookings/hooks/use-customers"
import { useSuspenseBookables } from "@/features/bookables/hooks/use-bookables"
import { formatDuration } from "@/features/bookables/lib/utils"
import { BookableImage } from "@/features/bookables/components/bookable-image"
import { DurationUnit } from "@/generated/prisma"
import { formatCurrency } from "@/lib/format-utils"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/format-utils"
import { useCurrentOrganizationWithSettings } from "@/features/organizations/hooks/use-organizations"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

const formSchema = z
  .object({
    customerName: z.string().min(1, { message: "Customer name is required" }),
    bookable: z.string().min(1, { message: "Service type is required" }),
    status: z.enum(["pending", "approved", "in_progress", "canceled", "completed"]),
    startDate: z.date(),
    endDate: z.date(),
    startTime: z.string(),
    endTime: z.string(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      const [startHours = 0, startMinutes = 0] = data.startTime.split(":").map(Number)
      const [endHours = 0, endMinutes = 0] = data.endTime.split(":").map(Number)

      start.setHours(startHours, startMinutes, 0)
      end.setHours(endHours, endMinutes, 0)

      return !isBefore(end, start)
    },
    {
      message: "End date/time must be after start date/time",
      path: ["endDate"],
    },
  )

export type BookingFormValues = z.infer<typeof formSchema>

interface BookingDialogProps {
  booking: CalendarBooking | null
  isOpen: boolean
  onClose: () => void
  onSave: (booking: CalendarBooking) => void
  onDelete: (bookingId: string) => void
}

export const BookingDialog = memo(({ booking, isOpen, onClose, onSave, onDelete }: BookingDialogProps) => {
  const defaultStartTime = useMemo(() => `${DefaultStartHour.toString().padStart(2, "0")}:00`, [])
  const defaultEndTime = useMemo(() => `${DefaultEndHour.toString().padStart(2, "0")}:00`, [])
  
  const createBooking = useCreateBooking()
  const updateBooking = useUpdateBooking()
  const findOrCreateCustomer = useFindOrCreateCustomer()
  const currentOrg = useCurrentOrganizationWithSettings()
  const dateTimeFormat = (currentOrg?.dateTimeFormat as "12" | "24") || "24"
  const currency = currentOrg?.currency || "USD"
  
  // Fetch all bookables from database
  const allBookablesQuery = useSuspenseBookables(null)
  const bookables = allBookablesQuery.data.items
  
  // Group bookables by collection
  const groupedBookables = useMemo(() => {
    // Return all bookables as a single group
    return [{
        collectionId: null,
        collectionName: null,
      bookables: bookables,
    }];
  }, [bookables]);

  const isSaving = createBooking.isPending || updateBooking.isPending || findOrCreateCustomer.isPending
  
  // Search state for bookable selection
  const [bookableSearch, setBookableSearch] = useState("")
  const [bookablePopoverOpen, setBookablePopoverOpen] = useState(false)
  const bookableTriggerRef = useRef<HTMLButtonElement>(null)
  
  // Filter grouped bookables by search
  const filteredGroupedBookables = useMemo(() => {
    if (!bookableSearch.trim()) {
      return groupedBookables;
    }
    
    const searchLower = bookableSearch.toLowerCase();
    return groupedBookables
      .map((group) => ({
        ...group,
        bookables: group.bookables.filter((bookable) =>
          bookable.title.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((group) => group.bookables.length > 0);
  }, [groupedBookables, bookableSearch]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      bookable: "",
      status: "pending",
      startDate: new Date(),
      endDate: new Date(),
      startTime: defaultStartTime,
      endTime: defaultEndTime,
    },
  })

  const selectedBookableId = form.watch("bookable")
  const startTimeValue = form.watch("startTime")
  const startDateValue = form.watch("startDate")

  const bookableData = useMemo(
    () => bookables.find((b) => b.id === selectedBookableId),
    [selectedBookableId, bookables],
  )

  const prevBookableIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isOpen) prevBookableIdRef.current = null
  }, [isOpen])
  // When user selects a bookable (and it changes), set start/end to that bookable's operating window + duration
  useEffect(() => {
    if (!selectedBookableId || !bookableData) return
    if (prevBookableIdRef.current === selectedBookableId) return
    prevBookableIdRef.current = selectedBookableId
    const start = bookableData.startTime ?? `${DefaultStartHour.toString().padStart(2, "0")}:00`
    const durationMinutes = durationToMinutes(bookableData.durationValue, bookableData.durationUnit)
    const [startH = 0, startM = 0] = start.split(":").map(Number)
    const startDate = new Date(startDateValue)
    startDate.setHours(startH, startM, 0, 0)
    const endDate = addMinutes(startDate, durationMinutes)
    const endTimeRounded = `${endDate.getHours().toString().padStart(2, "0")}:${(Math.floor(endDate.getMinutes() / 15) * 15).toString().padStart(2, "0")}`
    form.setValue("startTime", start)
    form.setValue("endTime", endTimeRounded)
  }, [selectedBookableId, bookableData, startDateValue, form])

  // Auto-calculate end time based on bookable duration when start time changes (single-day)
  useEffect(() => {
    if (!startTimeValue || !selectedBookableId || !bookableData) return
    if (bookableData.allowMultipleDays && (bookableData.durationUnit === "DAYS" || bookableData.durationUnit === "NIGHTS")) {
      const endDate = new Date(startDateValue)
      endDate.setDate(endDate.getDate() + bookableData.durationValue)
      form.setValue("endDate", endDate)
      return
    }
    if (bookableData.durationUnit === DurationUnit.HOURS || bookableData.durationUnit === DurationUnit.MINUTES) {
      const [startHours = 0, startMinutes = 0] = startTimeValue.split(":").map(Number)
      const durationMinutes = durationToMinutes(bookableData.durationValue, bookableData.durationUnit)
      const startDate = new Date(startDateValue)
      startDate.setHours(startHours, startMinutes, 0, 0)
      const endDate = addMinutes(startDate, durationMinutes)
      const endTimeRounded = `${endDate.getHours().toString().padStart(2, "0")}:${(Math.floor(endDate.getMinutes() / 15) * 15).toString().padStart(2, "0")}`
      form.setValue("endTime", endTimeRounded)
      form.setValue("endDate", startDateValue)
    } else if (bookableData.durationUnit === DurationUnit.DAYS) {
      const endDate = new Date(startDateValue)
      endDate.setDate(endDate.getDate() + bookableData.durationValue)
      form.setValue("endDate", endDate)
    }
  }, [startTimeValue, selectedBookableId, bookableData, startDateValue, form])

  const formatTimeForInput = useCallback((date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = Math.floor(date.getMinutes() / 15) * 15
    return `${hours}:${minutes.toString().padStart(2, "0")}`
  }, [])

  useEffect(() => {
    if (isOpen) {
    if (booking) {
      const start = new Date(booking.start)
      const end = new Date(booking.end)

        form.reset({
          customerName: booking.title || "",
          bookable: "",
          status: booking.status || "pending",
          startDate: start,
          endDate: end,
          startTime: formatTimeForInput(start),
          endTime: formatTimeForInput(end),
        })
    } else {
        form.reset({
          customerName: "",
          bookable: "",
          status: "pending",
          startDate: new Date(),
          endDate: new Date(),
          startTime: defaultStartTime,
          endTime: defaultEndTime,
        })
      }
    }
  }, [booking, isOpen, form, formatTimeForInput, defaultStartTime, defaultEndTime])

  const timeOptions = useMemo(() => {
    let minHour = StartHour
    let minMinute = 0
    let maxHour = EndHour
    let maxMinute = 0
    if (bookableData?.startTime) {
      const [h, m] = bookableData.startTime.split(":").map(Number)
      minHour = h ?? StartHour
      minMinute = m ?? 0
    }
    if (bookableData?.endTime) {
      const [h, m] = bookableData.endTime.split(":").map(Number)
      maxHour = h ?? EndHour
      maxMinute = m ?? 0
    }
    const options: { label: string; value: string }[] = []
    const startMinutes = minHour * 60 + minMinute
    const endMinutes = maxHour * 60 + maxMinute
    for (let total = startMinutes; total <= endMinutes; total += 15) {
      const hour = Math.floor(total / 60)
      const minute = total % 60
      const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      const date = new Date(2000, 0, 1, hour, minute)
      options.push({ label: formatTime(date, dateTimeFormat), value })
    }
    return options.length > 0 ? options : (() => {
      const fallback: { label: string; value: string }[] = []
      for (let hour = StartHour; hour <= EndHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
          fallback.push({ label: formatTime(new Date(2000, 0, 1, hour, minute), dateTimeFormat), value })
        }
      }
      return fallback
    })()
  }, [dateTimeFormat, bookableData?.startTime, bookableData?.endTime])

  const handleSubmit = useCallback(
    async (values: BookingFormValues) => {
      const start = new Date(values.startDate)
      const end = new Date(values.endDate)

      const [startHours = 0, startMinutes = 0] = values.startTime.split(":").map(Number)
      const [endHours = 0, endMinutes = 0] = values.endTime.split(":").map(Number)

      if (startHours < StartHour || startHours > EndHour || endHours < StartHour || endHours > EndHour) {
        form.setError("startTime", {
          type: "manual",
          message: `Selected time must be between ${StartHour}:00 and ${EndHour}:00`,
        })
        return
      }

      start.setHours(startHours, startMinutes, 0, 0)
      end.setHours(endHours, endMinutes, 0, 0)

      const dateTimeValidation = validateBookingDateTime(start, end)
      if (!dateTimeValidation.valid) {
        form.setError("endTime", {
          type: "manual",
          message: dateTimeValidation.error,
        })
        return
      }

      const bookingColor = (booking?.color as BookingColor) || "sky"
      const bookingTitle = values.customerName.trim() || (booking?.title || "New Booking")

      const optimisticBooking: CalendarBooking = {
        allDay: false,
        color: bookingColor,
        end,
        id: booking?.id && !booking.id.startsWith("temp-") ? booking.id : `temp-${Date.now()}`,
        start,
        status: values.status,
        title: bookingTitle,
        createdAt: booking?.createdAt || new Date(),
      }

      onSave(optimisticBooking)
      onClose()
      try {
        // Find or create customer
        const customer = await findOrCreateCustomer.mutateAsync({
          name: values.customerName,
          email: null,
          phone: null,
        })

        // Find bookable (required field)
        const selectedBookable = bookables.find((b) => b.id === values.bookable)
        if (!selectedBookable) {
          toast.error("Failed to create booking", {
            description: "Invalid service type selected",
          })
          return
        }

        const basePrice = selectedBookable.basePrice || 0
        const upsellsTotal = 0
        const subtotal = basePrice + upsellsTotal
        const tax = computeBookableTax(selectedBookable, subtotal)
        const total = subtotal + tax

        if (booking?.id) {
          await updateBooking.mutateAsync({
            id: booking.id,
            customerId: customer.id,
            bookableId: selectedBookable.id,
            startTime: start,
            endTime: end,
            status: values.status,
            notes: undefined,
            basePrice,
            serviceFee: 0,
            tax,
            total,
          })
        } else {
          await createBooking.mutateAsync({
            customerId: customer.id,
            bookableId: selectedBookable.id,
            startTime: start,
            endTime: end,
            status: values.status,
            notes: undefined,
            basePrice,
            upsellsTotal: 0,
            serviceFee: 0,
            tax,
            discount: 0,
            total,
          })
        }
      } catch (error) {
        throw error
      }
    },
    [booking, form, onSave, onClose, createBooking, updateBooking, findOrCreateCustomer, bookables],
  )

  const handleDelete = useCallback(() => {
    if (booking?.id) {
      onDelete(booking.id)
      onClose()
    }
  }, [booking, onDelete, onClose])

  const startDate = form.watch("startDate")
  const endDate = form.watch("endDate")

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="min-w-[500px] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{booking?.id ? "Edit Booking" : "Create Booking"}</DialogTitle>
          <DialogDescription>
            {booking?.id ? "Edit the details of this booking" : "Add a new booking to your calendar"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="customerName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="booking-customer-name">Customer Name</FieldLabel>
                  <Input
                    id="booking-customer-name"
                    placeholder="Enter customer name"
                    {...field}
                  />
                  <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="bookable"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="booking-bookable">Service Type</FieldLabel>
                  <Popover 
                    open={bookablePopoverOpen} 
                    onOpenChange={(open) => {
                      setBookablePopoverOpen(open);
                      if (!open) {
                        setBookableSearch("");
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        id="booking-bookable"
                        ref={bookableTriggerRef}
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={bookablePopoverOpen}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 w-full text-left border rounded-md bg-background transition-colors",
                          "hover:bg-muted/30",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (() => {
                          const selectedBookable = bookables.find((b) => b.id === field.value);
                          if (!selectedBookable) return "Select service type";
                          return (
                            <>
                              <BookableImage
                                images={selectedBookable.images}
                                alt={selectedBookable.title}
                                size={56}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base text-foreground">
                                  {selectedBookable.title}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                                  <span className="font-medium">
                                    {formatCurrency(selectedBookable.basePrice, currency)}
                                  </span>
                                  <span>
                                    {formatDuration(selectedBookable.durationValue, selectedBookable.durationUnit)}
                                  </span>
                                </div>
                              </div>
                            </>
                          );
                        })() : (
                          <>
                            <div className="w-14 h-14 bg-muted rounded" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-base">
                                Select service type
                              </div>
                            </div>
                          </>
                        )}
                        <CalendarLine className="ml-2 size-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="p-0 max-w-none w-auto" 
                      align="start"
                      onWheel={(e) => e.stopPropagation()}
                      style={{
                        width: bookableTriggerRef.current?.offsetWidth,
                      }}
                    >
                      {/* Search bar */}
                      <div className="p-4 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search bookables..."
                            value={bookableSearch}
                            onChange={(e) => setBookableSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      
                      {/* Scrollable bookables list */}
                      <div className="h-[400px] overflow-y-auto overflow-x-hidden">
                        <div>
                          {filteredGroupedBookables.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                              No bookables found
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              {filteredGroupedBookables.map((group) => (
                                <div key={group.collectionId || "ungrouped"} className="flex flex-col">
                                  {group.collectionName && (
                                    <div className="px-4 pt-4 pb-2">
                                      <h3 className="text-sm font-semibold text-foreground">
                                        {group.collectionName}
                                      </h3>
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    {group.bookables.map((bookable) => {
                                      const isSelected = field.value === bookable.id;
                                      return (
                                        <button
                                          key={bookable.id}
                                          type="button"
                                          className={cn(
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors w-full text-left",
                                            "hover:bg-muted/30",
                                            isSelected && "bg-primary/5"
                                          )}
                                          onClick={() => {
                                            form.setValue("bookable", bookable.id);
                                            setBookablePopoverOpen(false);
                                          }}
                                        >
                                          <BookableImage
                                            images={bookable.images}
                                            alt={bookable.title}
                                            size={56}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-base text-foreground">
                                              {bookable.title}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                                              <span className="font-medium">
                                                {formatCurrency(bookable.basePrice, currency)}
                                              </span>
                                              <span>
                                                {formatDuration(bookable.durationValue, bookable.durationUnit)}
                                              </span>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="status"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="booking-status">Status</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="booking-status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", status.circleColor)} />
                            <span>{status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                </Field>
              )}
            />


            <div className="flex gap-4">
              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="booking-start-date">Start Date</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="booking-start-date"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                          <CalendarLine className="ml-auto size-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date);
                              // If end date is before the new start date, update it to match the start date
                              if (isBefore(endDate, date)) {
                                form.setValue("endDate", date);
                              }
                            }
                          }}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="startTime"
                render={({ field, fieldState }) => (
                  <Field className="min-w-28" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="booking-start-time">Start Time</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="booking-start-time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </Field>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Controller
                control={form.control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <Field className="flex-1" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="booking-end-date">End Date</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="booking-end-date"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                          <CalendarLine className="ml-auto size-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => isBefore(date, startDate)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="endTime"
                render={({ field, fieldState }) => (
                  <Field className="min-w-28" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="booking-end-time">End Time</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="booking-end-time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </Field>
                )}
              />
            </div>

            <div className="flex flex-row sm:justify-between mt-6">
              {booking?.id && (
                <Button
                  type="button"
                  aria-label="Delete booking"
                  onClick={handleDelete}
                  size="icon"
                  variant="outline"
                >
                  <DeleteBinLine aria-hidden="true" size={16} />
                </Button>
              )}
              <div className="flex flex-1 justify-end gap-2">
                <Button type="button" onClick={onClose} variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
})

BookingDialog.displayName = "BookingDialog"
