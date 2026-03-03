import type { Bookable } from "@/generated/prisma";

export type BookableWithRelations = Bookable;

export type BookableImage = string | { url: string; alt?: string };

