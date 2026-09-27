export { extractDocumentText } from "./textExtraction";
export type { ExtractedContent, ExtractedLink, ExtractedImage } from "./textExtraction";

export { analyzeKeywords } from "./keywordAnalysis";
export type { KeywordResult } from "./keywordAnalysis";

export { analyzeReadability, analyzeLinks, findDuplicateKeywords } from "./readabilityAnalysis";
export type {
  ReadabilityResult,
  LinkResult,
  DuplicateKeywordResult,
  ReadabilityLabel,
} from "./readabilityAnalysis";

export { buildSeoChecklist, suggestInternalLinks } from "./seoChecklist";
export type {
  SeoChecklist,
  SeoCheckItem,
  CheckStatus,
  InternalLinkSuggestion,
} from "./seoChecklist";

export { validateJsonLd, isSupportedSchemaType } from "./jsonLdValidation";
export type { SupportedSchemaType } from "./jsonLdValidation";

export {
  localBusinessSchema,
  podcastSeriesSchema,
  podcastEpisodeSchema,
  extractVideoBlocks,
  videoSchema,
  speakableSchema,
} from "./schemaPresets";
export type {
  LocalBusinessFields,
  PodcastSeriesFields,
  PodcastEpisodeFields,
  VideoBlockData,
} from "./schemaPresets";

export { parseYoastRedirectCsv, parseSeoPressCsv, RedirectParseError } from "./redirectImport";
export type { ParsedRedirect } from "./redirectImport";
