
import { z } from "zod";

export const studioSchema = z.object({
  title: z.string().trim().min(5).max(100),

  category: z.enum([
    "Photo Studio",
    "Film Stage",
    "Podcast Lounge",
    "Music Suite",
    "Workshop",
  ]),

  hourlyRate: z.coerce.number().positive(),

  securityDeposit: z.coerce.number().min(0),

  maxCapacity: z.coerce.number().int().positive(),

  location: z.object({
    address: z.string().trim().min(5),
    city: z.string().trim().min(2),
  }),

  image: z.string().url(),

  gallery: z.array(z.string().url()).default([]),

  amenities: z.array(z.string().trim().min(1)).default([]),

  overview: z.string().trim().min(20).max(3000),
});
