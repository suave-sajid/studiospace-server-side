
import { z } from "zod";

export const bookingSchema = z
  .object({
    studioId: z
      .string()
      .trim()
      .min(1, "Studio ID is required"),

    startAt: z
      .string()
      .datetime({
        offset: true,
        message: "A valid start date and time is required.",
      }),

    endAt: z
      .string()
      .datetime({
        offset: true,
        message: "A valid end date and time is required.",
      }),
  })
  .refine(
    (data) =>
      new Date(data.endAt).getTime() >
      new Date(data.startAt).getTime(),
    {
      message: "End time must be after start time.",
      path: ["endAt"],
    }
  )
  .refine(
    (data) =>
      new Date(data.startAt).getTime() > Date.now(),
    {
      message: "Booking must start in the future.",
      path: ["startAt"],
    }
  );
