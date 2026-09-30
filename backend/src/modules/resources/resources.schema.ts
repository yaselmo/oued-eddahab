import { z } from "zod";

export const resourceTypeSchema = z.enum([
  "NOTES",
  "SUMMARY",
  "EXAM",
  "EXERCISE",
  "ASSIGNMENT",
  "OTHER",
]);

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().trim().max(maximum).optional(),
  );

export const listResourcesSchema = z.object({
  search: optionalText(200),
  type: resourceTypeSchema.optional(),
  courseId: z.string().uuid().optional(),
}).strict();

export const resourceIdSchema = z.object({
  id: z.string().uuid(),
});

export const createResourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(2_000),
  type: resourceTypeSchema,
  academicYear: optionalText(50),
  professor: optionalText(120),
  courseId: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().uuid().optional(),
  ),
}).strict();

export const createCourseSchema = z.object({
  name: z.string().trim().min(1).max(150),
  code: optionalText(50),
}).strict();

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
