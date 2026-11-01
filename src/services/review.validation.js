
import { z } from "zod";

export const reviewSchema = z.object({
  bookingId: z.string().trim().min(1, "Booking ID is required."),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(500),
});
