import { z } from "zod";

// ── Manual price suggestion (before product exists) ──────────────────
export const manualSuggestionSchema = z.object({
  productName: z
    .string({ required_error: "productName is required" })
    .min(2, "productName must be at least 2 characters"),

  yourPrice: z
    .number({ required_error: "yourPrice is required" })
    .positive("yourPrice must be a positive number"),

  competitorUrls: z
    .array(z.string().url("Each competitor URL must be a valid URL"))
    .optional()
    .default([]),
});

// ── Single URL scrape ─────────────────────────────────────────────────
export const scrapeURLSchema = z.object({
  url: z
    .string({ required_error: "url is required" })
    .url("Must be a valid URL"),
});

// ── Product-based suggestion (productId comes from route param) ───────
export const productSuggestionSchema = z.object({
  competitorUrls: z
    .array(z.string().url("Each competitor URL must be a valid URL"))
    .optional()
    .default([]),
});

export type ManualSuggestionInput = z.infer<typeof manualSuggestionSchema>;
export type ScrapeURLInput = z.infer<typeof scrapeURLSchema>;
export type ProductSuggestionInput = z.infer<typeof productSuggestionSchema>;
