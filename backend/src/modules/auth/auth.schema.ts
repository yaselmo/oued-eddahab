import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),

  firstName: z.string().min(1),
  lastName: z.string().min(1),

  age: z.number().int().min(16).max(100).optional(),

  city: z.string().min(1).optional(),
  nationality: z.string().min(1).optional(),
  phone: z.string().optional(),

  languages: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),

  sex: z
    .enum([
      "MALE",
      "FEMALE",
      "OTHER",
      "PREFER_NOT_TO_SAY",
    ])
    .optional(),

  program: z.string().optional(),

  year: z.number().int().min(1).max(5).optional(),

  institutionId: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;