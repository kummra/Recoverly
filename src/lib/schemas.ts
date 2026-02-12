import { z } from "zod";

export const MAX_WEEKLY_GOAL_ML = 5000;
export const DRINK_TYPES = ["beer", "wine", "whiskey", "vodka", "other"] as const;
export const MESSAGE_ROLES = ["user", "assistant"] as const;

export const goalSchema = z.object({
  goalWeeklyMl: z.number().int().min(0).max(MAX_WEEKLY_GOAL_ML),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
});

export const drinkRecordSchema = z.object({
  quantity: z.number().int().min(1).max(5000),
  type: z.enum(DRINK_TYPES),
  mood: z.string().trim().max(120).optional(),
  createdAt: z.date().optional()
});

export const aiMessageSchema = z.object({
  role: z.enum(MESSAGE_ROLES),
  content: z.string().trim().min(1).max(2000)
});

/** Maximum messages sent per API request (sliding context window). */
export const AI_CONTEXT_WINDOW = 50;

export const aiRequestSchema = z.object({
  chatId: z.string().trim().min(4).max(128).optional(),
  messages: z.array(aiMessageSchema).min(1).max(AI_CONTEXT_WINDOW)
});

export type GoalInput = z.infer<typeof goalSchema>;
export type DrinkRecordInput = z.infer<typeof drinkRecordSchema>;
export type AIRequestInput = z.infer<typeof aiRequestSchema>;
export type AIMessageInput = z.infer<typeof aiMessageSchema>;
