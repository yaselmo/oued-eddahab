import { z } from "zod";
export const clubStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const clubCategorySchema = z.enum([
    "TECH",
    "SPORT",
    "CULTURE",
    "ART",
    "SCIENCE",
    "SOCIAL",
    "ENTREPRENEURSHIP",
    "OTHER",
]);
const requiredText = (minimum, maximum) => z.string().trim().min(minimum).max(maximum);
export const clubIdSchema = z.object({
    id: z.string().uuid(),
});
export const listClubsSchema = z
    .object({
    // public  : approved clubs of the user's institution
    // mine    : every club proposed by the user (any status)
    // review  : pending clubs of the user's institution (admins/moderators)
    scope: z.enum(["public", "mine", "review"]).default("public"),
    search: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().max(200).optional()),
    category: clubCategorySchema.optional(),
})
    .strict();
// The institution is never sent by the client: it is the user's own institution.
export const createClubSchema = z
    .object({
    name: requiredText(3, 100),
    description: requiredText(20, 2_000),
    category: clubCategorySchema,
    responsibleName: requiredText(2, 120),
    responsibleEmail: z.string().trim().toLowerCase().email().max(254),
    activities: requiredText(10, 2_000),
    additionalInfo: z.string().trim().max(2_000).optional(),
})
    .strict();
export const updateClubSchema = createClubSchema.partial().extend({
    removeLogo: z
        .preprocess((value) => value === true || value === "true" || value === "1", z.boolean())
        .optional(),
});
export const rejectClubSchema = z
    .object({
    reason: requiredText(3, 500),
})
    .strict();
//# sourceMappingURL=clubs.schema.js.map