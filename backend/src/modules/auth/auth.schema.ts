import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  username: z
    .string()
    .min(3)
    .max(30),

  password: z
    .string()
    .min(8),

  firstName: z
    .string()
    .min(1)
    .max(50),

  lastName: z
    .string()
    .min(1)
    .max(50),

  program: z.string().max(100).optional(),

  year: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;