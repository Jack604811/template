import {
  Wine,
  Cake,
  GlassWater,
  Gift,
  Coffee,
  IceCream,
  Combine as Champagne,
  Heart,
  PartyPopper,
  Utensils,
  Pizza,
  Briefcase,
  Hotel,
  Home,
  CalendarPlus,
  CreditCard,
  Mail,
  CheckCircle2,
  Clock,
  MessageSquare,
  Banknote,
  Globe,
} from "lucide-react";
import type { Bookable, TimelineEvent } from "./types";

export const bookingDurationHours = 2.5;

export const serviceFeeRate = 0.18;
export const taxRate = 0.085;
export const memberDiscountRate = 0.1;

export const bookablePrices: Record<string, number> = {
  "Romantic Dinner": 1800000,
  "Family Christmas Celebration": 2500000,
  "Birthday Party": 2200000,
  "Private Dining": 3000000,
  "Fine Dining": 2800000,
  Brunch: 1500000,
  "Business Lunch": 2000000,
  "Casual Dining": 1200000,
  Dessert: 800000,
  "Hotel Room": 3500000,
  "Villa Rental": 5000000,
  "Conference Room": 4000000,
};

export const bookables: Bookable[] = [
  { icon: Heart, label: "Romantic Dinner", color: "bg-rose-100 text-rose-600", isMultiDay: false },
  { icon: Cake, label: "Family Christmas Celebration", color: "bg-pink-100 text-pink-600", isMultiDay: false },
  { icon: PartyPopper, label: "Birthday Party", color: "bg-purple-100 text-purple-600", isMultiDay: false },
  { icon: Wine, label: "Private Dining", color: "bg-indigo-100 text-indigo-600", isMultiDay: false },
  { icon: Utensils, label: "Fine Dining", color: "bg-orange-100 text-orange-600", isMultiDay: false },
  { icon: Coffee, label: "Brunch", color: "bg-amber-100 text-amber-600", isMultiDay: false },
  { icon: Briefcase, label: "Business Lunch", color: "bg-slate-100 text-slate-600", isMultiDay: false },
  { icon: Pizza, label: "Casual Dining", color: "bg-red-100 text-red-600", isMultiDay: false },
  { icon: IceCream, label: "Dessert", color: "bg-cyan-100 text-cyan-600", isMultiDay: false },
  { icon: Hotel, label: "Hotel Room", color: "bg-blue-100 text-blue-600", isMultiDay: true },
  { icon: Home, label: "Villa Rental", color: "bg-green-100 text-green-600", isMultiDay: true },
  { icon: Briefcase, label: "Conference Room", color: "bg-gray-100 text-gray-600", isMultiDay: true },
];

export const availableUpsells = [
  {
    name: "Premium Wine Pairing",
    description: "Selection of 3 wines paired with courses",
    price: 340000,
    icon: Wine,
  },
  { name: "Champagne Bottle", description: "Veuve Clicquot Yellow Label", price: 480000, icon: Champagne },
  { name: "Dessert Tasting Platter", description: "Chef's selection of 5 mini desserts", price: 180000, icon: Cake },
  { name: "Cocktail Package", description: "4 premium cocktails for the table", price: 272000, icon: GlassWater },
  { name: "Appetizer Sampler", description: "Chef's choice of 5 appetizers", price: 220000, icon: Gift },
  {
    name: "Premium Coffee Service",
    description: "French press coffee with petit fours",
    price: 100000,
    icon: Coffee,
  },
  { name: "Cake Decoration", description: "Custom message on celebration cake", price: 140000, icon: Cake },
  { name: "Ice Cream Sundae Bar", description: "Build your own sundae experience", price: 160000, icon: IceCream },
];

export const paymentMethods = [
  { value: "Cash", label: "Cash", icon: Banknote, description: "Physical currency payment" },
  { value: "Bank Transfer", label: "Bank Transfer", icon: CreditCard, description: "Direct bank electronic transfer" },
  { value: "Online Payment", label: "Online Payment", icon: Globe, description: "Credit card or online methods" },
] as const;

export const idTypes = ["ID", "CC", "NIT", "Passport"] as const;

export const timelineEvents: TimelineEvent[] = [
  {
    id: 1,
    title: "Reservation Created",
    description: "Online booking submitted",
    date: "Dec 18, 2024",
    time: "3:45 PM",
    icon: CalendarPlus,
    status: "completed",
  },
  {
    id: 2,
    title: "Deposit Received",
    description: "Payment of $200.00 processed",
    date: "Dec 18, 2024",
    time: "3:47 PM",
    icon: CreditCard,
    status: "completed",
  },
  {
    id: 3,
    title: "Confirmation Sent",
    description: "Email sent to james.martinez@email.com",
    date: "Dec 18, 2024",
    time: "3:50 PM",
    icon: Mail,
    status: "completed",
  },
  {
    id: 4,
    title: "Special Request",
    description: "Window table and cake decoration confirmed",
    date: "Dec 20, 2024",
    time: "11:20 AM",
    icon: MessageSquare,
    status: "completed",
  },
  {
    id: 5,
    title: "Reminder Sent",
    description: "24-hour reminder email scheduled",
    date: "Dec 24, 2024",
    time: "7:00 PM",
    icon: Clock,
    status: "pending",
  },
  {
    id: 6,
    title: "Guest Arrival",
    description: "Awaiting guest check-in",
    date: "Dec 25, 2024",
    time: "7:00 PM",
    icon: CheckCircle2,
    status: "upcoming",
  },
];

export const customFieldConfigs = {
  multiDay: [
    {
      key: "bedType",
      label: "Bed Type",
      type: "select" as const,
      options: ["King Size", "Queen Size", "Twin Beds", "Single"],
    },
    {
      key: "viewPreference",
      label: "View Preference",
      type: "select" as const,
      options: ["Ocean View", "City View", "Garden View", "Mountain View"],
    },
    {
      key: "floorPreference",
      label: "Floor Preference",
      type: "select" as const,
      options: ["Higher Floor (8+)", "Middle Floor (4-7)", "Lower Floor (1-3)", "No Preference"],
    },
    { key: "smoking", label: "Smoking", type: "select" as const, options: ["Non-Smoking", "Smoking"], badge: true },
    { key: "extraAmenities", label: "Extra Amenities", type: "text" as const },
    {
      key: "parking",
      label: "Parking",
      type: "select" as const,
      options: ["Valet Service", "Self-Parking", "No Parking"],
      badge: true,
    },
    {
      key: "airportTransfer",
      label: "Airport Transfer",
      type: "select" as const,
      options: ["Required - Both Ways", "Required - Arrival Only", "Required - Departure Only", "Not Required"],
    },
    { key: "lateCheckout", label: "Late Check-out", type: "text" as const },
  ],
  singleDay: [
    { key: "dietaryRestrictions", label: "Dietary Restrictions", type: "text" as const },
    {
      key: "seatingPreference",
      label: "Seating Preference",
      type: "select" as const,
      options: ["Window with view", "Booth", "Bar Seating", "Patio", "Private Room"],
    },
    { key: "specialOccasion", label: "Special Occasion", type: "text" as const },
    {
      key: "highChair",
      label: "High Chair Needed",
      type: "select" as const,
      options: ["Yes (1)", "Yes (2)", "Yes (3)", "No"],
      badge: true,
    },
    {
      key: "beveragePairing",
      label: "Beverage Pairing",
      type: "select" as const,
      options: ["Wine Pairing", "Cocktail Pairing", "Non-Alcoholic", "None"],
    },
    {
      key: "cakeService",
      label: "Cake Service",
      type: "select" as const,
      options: ["Outside Cake", "House Dessert", "No Cake"],
      badge: true,
    },
    {
      key: "musicPreference",
      label: "Music Preference",
      type: "select" as const,
      options: ["Soft Jazz", "Classical", "Pop", "No Music"],
    },
    {
      key: "parkingValidation",
      label: "Parking Validation",
      type: "select" as const,
      options: ["Required", "Not Required"],
      badge: true,
    },
  ],
};

