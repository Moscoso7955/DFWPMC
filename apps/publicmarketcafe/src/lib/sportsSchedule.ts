import { venue, venuePath } from "./venue";
import type { CalendarEventContent } from "./siteContentSchema";
const ROYALS_TEAM_ID = 118;
const CHIEFS_TEAM_ID = 12;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const KC_TZ = "America/Chicago";
type CacheEntry = {
    events: CalendarEventContent[];
    fetchedAt: number;
};
let royalsCache: CacheEntry | null = null;
let chiefsCache: CacheEntry | null = null;
function toKcDateKey(iso: string) {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: KC_TZ });
}
function toKcTimeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
        timeZone: KC_TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
function shortenTeamName(fullName: string) {
    const parts = fullName.split(" ");
    return parts[parts.length - 1];
}
async function fetchRoyalsGames(): Promise<CalendarEventContent[]> {
    const now = Date.now();
    if (royalsCache && now - royalsCache.fetchedAt < CACHE_TTL_MS) {
        return royalsCache.events;
    }
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    end.setMonth(end.getMonth() + 12);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${ROYALS_TEAM_ID}&startDate=${startDate}&endDate=${endDate}`;
    try {
        const response = await fetch(venuePath(url), { next: { revalidate: 21600 } });
        if (!response.ok)
            return royalsCache?.events ?? [];
        const data = (await response.json()) as {
            dates?: Array<{
                games?: Array<{
                    gamePk: number;
                    gameDate: string;
                    gameType?: string;
                    teams: {
                        home: {
                            team: {
                                id: number;
                                name: string;
                            };
                        };
                        away: {
                            team: {
                                id: number;
                                name: string;
                            };
                        };
                    };
                    status?: {
                        detailedState?: string;
                    };
                }>;
            }>;
        };
        const events: CalendarEventContent[] = [];
        for (const dateItem of data.dates ?? []) {
            for (const game of dateItem.games ?? []) {
                const isHome = game.teams.home.team.id === ROYALS_TEAM_ID;
                const opponentFullName = isHome ? game.teams.away.team.name : game.teams.home.team.name;
                const opponent = shortenTeamName(opponentFullName);
                const seasonSuffix = game.gameType === "S"
                    ? " (Spring)"
                    : game.gameType === "P" ||
                        game.gameType === "F" ||
                        game.gameType === "D" ||
                        game.gameType === "L" ||
                        game.gameType === "W"
                        ? " (Postseason)"
                        : "";
                events.push({
                    id: `royals-${game.gamePk}`,
                    date: toKcDateKey(game.gameDate),
                    title: `Royals ${isHome ? "vs" : "@"} ${opponent}${seasonSuffix}`,
                    time: toKcTimeLabel(game.gameDate),
                    description: `${isHome ? "Home game at Kauffman Stadium" : `Away game vs the ${opponentFullName}`}${game.status?.detailedState ? ` — ${game.status.detailedState}` : ""}`,
                    url: `https://www.mlb.com/gameday/${game.gamePk}`,
                });
            }
        }
        royalsCache = { events, fetchedAt: now };
        return events;
    }
    catch {
        return royalsCache?.events ?? [];
    }
}
type EspnCompetitor = {
    homeAway?: string;
    team?: {
        id?: string;
        name?: string;
        displayName?: string;
    };
};
async function fetchChiefsGames(): Promise<CalendarEventContent[]> {
    const now = Date.now();
    if (chiefsCache && now - chiefsCache.fetchedAt < CACHE_TTL_MS) {
        return chiefsCache.events;
    }
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${CHIEFS_TEAM_ID}/schedule`;
    try {
        const response = await fetch(venuePath(url), { next: { revalidate: 21600 } });
        if (!response.ok)
            return chiefsCache?.events ?? [];
        const data = (await response.json()) as {
            events?: Array<{
                id: string;
                date: string;
                seasonType?: {
                    id?: string | number;
                };
                season?: {
                    type?: string | number;
                };
                competitions?: Array<{
                    competitors?: EspnCompetitor[];
                }>;
                links?: Array<{
                    href?: string;
                }>;
            }>;
        };
        const events: CalendarEventContent[] = [];
        for (const game of data.events ?? []) {
            const competition = game.competitions?.[0];
            const chiefs = competition?.competitors?.find((c) => c.team?.id === String(CHIEFS_TEAM_ID));
            const opponent = competition?.competitors?.find((c) => c.team?.id !== String(CHIEFS_TEAM_ID));
            if (!chiefs || !opponent)
                continue;
            const isHome = chiefs.homeAway === "home";
            const opponentFullName = opponent.team?.displayName ?? opponent.team?.name ?? "Opponent";
            const opponentShort = opponent.team?.name ?? shortenTeamName(opponentFullName);
            const seasonTypeRaw = game.seasonType?.id ?? game.season?.type;
            const seasonType = String(seasonTypeRaw ?? "2");
            const seasonSuffix = seasonType === "1" ? " (Preseason)" : seasonType === "3" ? " (Postseason)" : "";
            events.push({
                id: `chiefs-${game.id}`,
                date: toKcDateKey(game.date),
                title: `Chiefs ${isHome ? "vs" : "@"} ${opponentShort}${seasonSuffix}`,
                time: toKcTimeLabel(game.date),
                description: isHome
                    ? "Home game at Arrowhead Stadium"
                    : `Away game vs the ${opponentFullName}`,
                url: game.links?.[0]?.href ?? "https://www.nfl.com/teams/kansas-city-chiefs/schedule",
            });
        }
        chiefsCache = { events, fetchedAt: now };
        return events;
    }
    catch {
        return chiefsCache?.events ?? [];
    }
}
export async function getSportsEvents(): Promise<CalendarEventContent[]> {
    if (venue.localPreview)
        return [];
    const [royals, chiefs] = await Promise.all([fetchRoyalsGames(), fetchChiefsGames()]);
    return [...royals, ...chiefs];
}
export function getSportsVariant(eventId: string): "royals" | "chiefs" | null {
    if (eventId.startsWith("royals-"))
        return "royals";
    if (eventId.startsWith("chiefs-"))
        return "chiefs";
    return null;
}
export function getCalendarNoteVariant(eventId: string): "royals" | "chiefs" | "ticketed" | null {
    const sports = getSportsVariant(eventId);
    if (sports)
        return sports;
    if (eventId.startsWith("ticketed-"))
        return "ticketed";
    return null;
}
