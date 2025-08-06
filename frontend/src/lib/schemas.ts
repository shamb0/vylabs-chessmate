import { z } from 'zod';

export const CoachingPayloadSchema = z.object({
  message: z.string(),
  cognitiveStage: z.enum(['Novice', 'Developing', 'Expert']),
  culturalContext: z.object({
    title: z.string(),
    content: z.string(),
  }).optional(),
  languageHints: z.array(z.object({
    term: z.string(),
    translation: z.string(),
  })).optional(),
});

export type CoachingPayload = z.infer<typeof CoachingPayloadSchema>;
