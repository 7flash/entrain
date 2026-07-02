import { Database, z } from 'sqlite-zod-orm';
import type { EntrainSessionV1 } from '@/format/entrain-format';

export const db = new Database(process.env.DB_PATH || 'entrain.db', {
  templates: z.object({
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    description: z.string(),
    category: z.string().default('focus'),
    tags: z.array(z.string()).default([]),
    minTokens: z.number().default(0),
    session: z.any(),
    sortOrder: z.number().default(0),
    isPublished: z.boolean().default(true),
  }),
  walletChallenges: z.object({
    publicKey: z.string(),
    nonce: z.string(),
    message: z.string(),
    expiresAt: z.number(),
    used: z.boolean().default(false),
  }),
  walletSessions: z.object({
    sessionId: z.string(),
    publicKey: z.string(),
    balance: z.number().default(0),
    expiresAt: z.number(),
  }),
  savedSessions: z.object({
    publicKey: z.string(),
    slug: z.string(),
    name: z.string(),
    session: z.any(),
  }),
}, {
  timestamps: true,
  relations: {},
});

export type TemplateRow = {
  id?: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  tags: string[];
  minTokens: number;
  session: EntrainSessionV1;
  sortOrder: number;
  isPublished: boolean;
};
