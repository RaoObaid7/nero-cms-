/**
 * SEO-112/116/118/119: Schema.org presets.
 *
 * Every function returns a plain object suitable for `JSON.stringify` and
 * emission in a `<script type="application/ld+json">` tag. No network calls.
 */

// ─── LocalBusiness (SEO-118) ──────────────────────────────────────────────────

export interface LocalBusinessFields {
  businessName?: string | null;
  businessDescription?: string | null;
  telephone?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: Array<{ value: string }> | null;
  priceRange?: string | null;
  logo?: { url?: string | null } | null;
}

export function localBusinessSchema(
  fields: LocalBusinessFields,
  serverURL: string,
): Record<string, unknown> | null {
  if (!fields.businessName) return null;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: fields.businessName,
    url: serverURL,
  };

  if (fields.businessDescription) schema.description = fields.businessDescription;
  if (fields.telephone) schema.telephone = fields.telephone;
  if (fields.priceRange) schema.priceRange = fields.priceRange;

  const hasAddress = fields.streetAddress || fields.city || fields.country;
  if (hasAddress) {
    schema.address = {
      "@type": "PostalAddress",
      ...(fields.streetAddress ? { streetAddress: fields.streetAddress } : {}),
      ...(fields.city ? { addressLocality: fields.city } : {}),
      ...(fields.country ? { addressCountry: fields.country } : {}),
    };
  }

  if (fields.latitude != null && fields.longitude != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: fields.latitude,
      longitude: fields.longitude,
    };
  }

  const hours = (fields.openingHours ?? []).map((h) => h.value).filter(Boolean);
  if (hours.length > 0) {
    schema.openingHours = hours;
  }

  if (fields.logo?.url) {
    schema.logo = { "@type": "ImageObject", url: fields.logo.url };
  }

  return schema;
}

// ─── Podcast (SEO-119) ────────────────────────────────────────────────────────

export interface PodcastSeriesFields {
  podcastSeriesName?: string | null;
  podcastSeriesDescription?: string | null;
  podcastFeedUrl?: string | null;
  podcastAuthor?: string | null;
}

export interface PodcastEpisodeFields {
  title: string;
  description?: string | null;
  podcastEpisodeNumber?: number | null;
  podcastSeason?: number | null;
  podcastAudioUrl?: string | null;
  url: string;
  datePublished?: string | null;
}

export function podcastSeriesSchema(
  settings: PodcastSeriesFields,
  serverURL: string,
): Record<string, unknown> | null {
  if (!settings.podcastSeriesName) return null;

  return {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: settings.podcastSeriesName,
    url: serverURL,
    ...(settings.podcastSeriesDescription
      ? { description: settings.podcastSeriesDescription }
      : {}),
    ...(settings.podcastFeedUrl ? { webFeed: settings.podcastFeedUrl } : {}),
    ...(settings.podcastAuthor
      ? { author: { "@type": "Person", name: settings.podcastAuthor } }
      : {}),
  };
}

export function podcastEpisodeSchema(
  episode: PodcastEpisodeFields,
  series: PodcastSeriesFields,
  serverURL: string,
): Record<string, unknown> | null {
  if (!episode.podcastAudioUrl) return null;

  return {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    url: episode.url,
    ...(episode.description ? { description: episode.description } : {}),
    ...(episode.datePublished ? { datePublished: episode.datePublished } : {}),
    ...(episode.podcastEpisodeNumber != null
      ? { episodeNumber: episode.podcastEpisodeNumber }
      : {}),
    ...(episode.podcastSeason != null
      ? { partOfSeason: { "@type": "PodcastSeason", seasonNumber: episode.podcastSeason } }
      : {}),
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: episode.podcastAudioUrl,
    },
    ...(series.podcastSeriesName ? { partOfSeries: podcastSeriesSchema(series, serverURL) } : {}),
  };
}

// ─── Video / Speakable (SEO-116) ──────────────────────────────────────────────

export interface VideoBlockData {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export function extractVideoBlocks(layout: unknown[]): VideoBlockData[] {
  const results: VideoBlockData[] = [];
  for (const block of layout) {
    const b = block as Record<string, unknown>;
    if (b.blockType !== "gallery") continue;
    const items = Array.isArray(b.items) ? b.items : [];
    for (const item of items) {
      const it = item as Record<string, unknown>;
      const media = it.media as Record<string, unknown> | null | undefined;
      if (!media?.url) continue;
      const mimeType = typeof media.mimeType === "string" ? media.mimeType : "";
      if (mimeType.startsWith("video/")) {
        results.push({
          url: String(media.url),
          alt: typeof media.alt === "string" ? media.alt : undefined,
          caption: typeof it.caption === "string" ? it.caption : undefined,
        });
      }
    }
  }
  return results;
}

export function videoSchema(video: VideoBlockData, uploadDate: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.alt || video.caption || "Video",
    description: video.caption || video.alt || "Video",
    thumbnailUrl: video.url,
    contentUrl: video.url,
    uploadDate,
  };
}

export function speakableSchema(selectors: string[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    cssSelector: selectors,
  };
}
