import { venue, venuePath } from "./venue";
// Turns a Spotify track link into a playable 30-second preview clip for
// link previews (og:audio). Spotify's Web API stopped returning
// preview_url for new apps in late 2024, so read the preview from the
// public embed player, and fall back to Apple's iTunes Search API
// (also 30-second previews) for the same song.
export type SongPreview = {
    trackId: string;
    title: string;
    artist: string;
    previewUrl: string;
    previewType: "audio/mpeg" | "audio/mp4";
    source: "spotify" | "apple";
};
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const CACHE_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, {
    value: SongPreview | null;
    expires: number;
}>();
// Accepts open.spotify.com/track/<id> (with or without /intl-xx/ and
// query strings) and spotify:track:<id>.
export function spotifyTrackId(input: string): string | null {
    const text = input.trim();
    const uri = /^spotify:track:([A-Za-z0-9]{22})$/.exec(text);
    if (uri)
        return uri[1];
    try {
        const url = new URL(text);
        if (url.hostname !== "open.spotify.com")
            return null;
        const match = /\/track\/([A-Za-z0-9]{22})/.exec(url.pathname);
        return match ? match[1] : null;
    }
    catch {
        return null;
    }
}
type EmbedEntity = {
    name?: string;
    artists?: {
        name?: string;
    }[];
    subtitle?: string;
    audioPreview?: {
        url?: string;
    };
};
function findEntity(node: unknown): EmbedEntity | null {
    if (!node || typeof node !== "object")
        return null;
    const record = node as Record<string, unknown>;
    // The track entry: has a name and artists, with or without a clip.
    if ("audioPreview" in record || (typeof record.name === "string" && Array.isArray(record.artists))) {
        return record as EmbedEntity;
    }
    for (const value of Object.values(record)) {
        const found = findEntity(value);
        if (found)
            return found;
    }
    return null;
}
async function fromSpotifyEmbed(trackId: string): Promise<SongPreview | {
    title: string;
    artist: string;
} | null> {
    const response = await fetch(venuePath(`https://open.spotify.com/embed/track/${trackId}`), {
        headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US" },
        next: { revalidate: 43200 },
    });
    if (!response.ok)
        return null;
    const html = await response.text();
    const json = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1];
    if (!json)
        return null;
    const entity = findEntity(JSON.parse(json));
    if (!entity)
        return null;
    const title = entity.name ?? "";
    const artist = entity.artists?.map((a) => a.name).filter(Boolean).join(", ") || entity.subtitle || "";
    const previewUrl = entity.audioPreview?.url;
    if (typeof previewUrl !== "string" || !previewUrl)
        return title ? { title, artist } : null;
    return { trackId, title, artist, previewUrl, previewType: "audio/mpeg", source: "spotify" };
}
async function spotifyTitle(trackId: string): Promise<{
    title: string;
    artist: string;
} | null> {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${trackId}`)}`;
    const response = await fetch(venuePath(url), { next: { revalidate: 43200 } });
    if (!response.ok)
        return null;
    const data = (await response.json()) as {
        title?: string;
    };
    return data.title ? { title: data.title, artist: "" } : null;
}
async function fromApple(trackId: string, title: string, artist: string): Promise<SongPreview | null> {
    const term = `${title} ${artist}`.trim();
    const url = `https://itunes.apple.com/search?media=music&entity=song&limit=10&term=${encodeURIComponent(term)}`;
    const response = await fetch(venuePath(url), { next: { revalidate: 43200 } });
    if (!response.ok)
        return null;
    const data = (await response.json()) as {
        results?: {
            trackName?: string;
            artistName?: string;
            previewUrl?: string;
        }[];
    };
    const results = (data.results ?? []).filter((r) => r.previewUrl);
    const wanted = title.toLowerCase();
    const best = results.find((r) => r.trackName?.toLowerCase() === wanted) ?? results[0];
    if (!best?.previewUrl)
        return null;
    return {
        trackId,
        title: best.trackName ?? title,
        artist: best.artistName ?? artist,
        previewUrl: best.previewUrl,
        previewType: "audio/mp4",
        source: "apple",
    };
}
export async function resolveSongPreview(spotifyUrl: string): Promise<SongPreview | null> {
    if (venue.localPreview)
        return null;
    const trackId = spotifyTrackId(spotifyUrl);
    if (!trackId)
        return null;
    const cached = cache.get(trackId);
    if (cached && cached.expires > Date.now())
        return cached.value;
    let value: SongPreview | null = null;
    try {
        const embed = await fromSpotifyEmbed(trackId).catch(() => null);
        if (embed && "previewUrl" in embed) {
            value = embed;
        }
        else {
            const meta = embed ?? (await spotifyTitle(trackId).catch(() => null));
            if (meta?.title)
                value = await fromApple(trackId, meta.title, meta.artist).catch(() => null);
        }
    }
    catch {
        value = null;
    }
    cache.set(trackId, { value, expires: Date.now() + (value ? CACHE_MS : 10 * 60 * 1000) });
    return value;
}
