import type { EntrainTemplateV1 } from "@/format/entrain-format";
import { summarizeSession, type SessionSummary } from "@/format/entrain-format";
import {
  analyzeSession,
  type ProtocolAnalysis,
} from "@/format/protocol-analyzer";
import {
  compareToReference,
  type ReferenceMatch,
} from "@/format/protocol-reference";
import {
  allTemplates,
  findTemplate,
  templatesByCategory,
  featuredTemplates,
  tierForMinTokens,
} from "./templates";
import { PUBLIC_FREE_MODE } from "./config";

export type SoundtrackRow = EntrainTemplateV1 & {
  summaryStats: SessionSummary;
  analysis: ProtocolAnalysis;
  referenceMatch: ReferenceMatch | null;
};

export function toSoundtrack(template: EntrainTemplateV1): SoundtrackRow {
  const publicTemplate = PUBLIC_FREE_MODE
    ? publicFreeTemplate(template)
    : template;
  return {
    ...publicTemplate,
    summaryStats: summarizeSession(publicTemplate.session),
    analysis: analyzeSession(publicTemplate.session),
    referenceMatch: compareToReference(
      publicTemplate.session,
      publicTemplate.lineage?.referenceId,
    ),
  };
}

export function publicFreeTemplate(
  template: EntrainTemplateV1,
): EntrainTemplateV1 {
  if (!PUBLIC_FREE_MODE) return template;
  return {
    ...template,
    tier: "free",
    minTokens: 0,
    unlockNote:
      "Public/free mode is enabled: this soundtrack can be played, exported, cloned, and inspected without wallet authorization.",
    market: { ...(template.market || {}), kind: "free", priceLamports: 0 },
  };
}

export function allSoundtracks() {
  return allTemplates().map(toSoundtrack);
}

export function featuredSoundtracks(n = 3) {
  return featuredTemplates(n).map(toSoundtrack);
}

export function soundtracksByCategory() {
  return templatesByCategory().map((group) => ({
    ...group,
    templates: group.templates.map(toSoundtrack),
  }));
}

export function findSoundtrack(slug: string) {
  const t = findTemplate(slug);
  return t ? toSoundtrack(t) : null;
}

export { tierForMinTokens };
