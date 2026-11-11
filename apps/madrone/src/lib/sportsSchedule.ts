import { venue, venuePath } from "./venue";
import type { CalendarEventContent } from "./siteContentSchema";
// Fort Worth / Dallas teams on the venue calendars: Rangers (MLB via
// statsapi), and Cowboys, Mavericks and Stars (ESPN site API).
const RANGERS_TEAM_ID = 140;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const LOCAL_TZ = "America/Chicago";
export type SportsVariant = "rangers" | "cowboys" | "mavs" | "stars";
type CacheEntry = {
    events: CalendarEventContent[];
    fetchedAt: number;
};
const caches = new Map<string, CacheEntry>();
function toLocalDateKey(iso: string) {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: LOCAL_TZ });
}
function toLocalTimeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
        timeZone: LOCAL_TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
function shortenTeamName(fullName: string) {
    const parts = fullName.split(" ");
    return parts[parts.length - 1];
}
async function fetchRangersGames(): Promise<CalendarEventContent[]> {
    const now = Date.now();
    const cached = caches.get("rangers");
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.events;
    }
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    end.setMonth(end.getMonth() + 12);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${RANGERS_TEAM_ID}&startDate=${startDate}&endDate=${endDate}`;
    try {
        const response = await fetch(venuePath(url), { next: { revalidate: 21600 } });
        if (!response.ok)
            return cached?.events ?? [];
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
                const isHome = game.teams.home.team.id === RANGERS_TEAM_ID;
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
                    id: `rangers-${game.gamePk}`,
                    date: toLocalDateKey(game.gameDate),
                    title: `Rangers ${isHome ? "vs" : "@"} ${opponent}${seasonSuffix}`,
                    time: toLocalTimeLabel(game.gameDate),
                    description: `${isHome ? "Home game at Globe Life Field" : `Away game vs the ${opponentFullName}`}${game.status?.detailedState ? ` — ${game.status.detailedState}` : ""}`,
                    url: `https://www.mlb.com/gameday/${game.gamePk}`,
                });
            }
        }
        caches.set("rangers", { events, fetchedAt: now });
        return events;
    }
    catch {
        return cached?.events ?? [];
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
type EspnTeamConfig = {
    variant: SportsVariant;
    leaguePath: string;
    teamId: string;
    teamLabel: string;
    homeVenue: string;
    fallbackUrl: string;
};
const ESPN_TEAMS: EspnTeamConfig[] = [
    {
        variant: "cowboys",
        leaguePath: "football/nfl",
        teamId: "6",
        teamLabel: "Cowboys",
        homeVenue: "AT&T Stadium",
        fallbackUrl: "https://www.espn.com/nfl/team/schedule/_/name/dal",
    },
    {
        variant: "mavs",
        leaguePath: "basketball/nba",
        teamId: "6",
        teamLabel: "Mavs",
        homeVenue: "American Airlines Center",
        fallbackUrl: "https://www.espn.com/nba/team/schedule/_/name/dal",
    },
    {
        variant: "stars",
        leaguePath: "hockey/nhl",
        teamId: "9",
        teamLabel: "Stars",
        homeVenue: "American Airlines Center",
        fallbackUrl: "https://www.espn.com/nhl/team/schedule/_/name/dal",
    },
];
async function fetchEspnGames(config: EspnTeamConfig): Promise<CalendarEventContent[]> {
    const now = Date.now();
    const cached = caches.get(config.variant);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.events;
    }
    const url = `https://site.api.espn.com/apis/site/v2/sports/${config.leaguePath}/teams/${config.teamId}/schedule`;
    try {
        const response = await fetch(venuePath(url), { next: { revalidate: 21600 } });
        if (!response.ok)
            return cached?.events ?? [];
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
            const ours = competition?.competitors?.find((c) => c.team?.id === config.teamId);
            const opponent = competition?.competitors?.find((c) => c.team?.id !== config.teamId);
            if (!ours || !opponent)
                continue;
            const isHome = ours.homeAway === "home";
            const opponentFullName = opponent.team?.displayName ?? opponent.team?.name ?? "Opponent";
            const opponentShort = opponent.team?.name ?? shortenTeamName(opponentFullName);
            const seasonTypeRaw = game.seasonType?.id ?? game.season?.type;
            const seasonType = String(seasonTypeRaw ?? "2");
            const seasonSuffix = seasonType === "1" ? " (Preseason)" : seasonType === "3" ? " (Postseason)" : "";
            events.push({
                id: `${config.variant}-${game.id}`,
                date: toLocalDateKey(game.date),
                title: `${config.teamLabel} ${isHome ? "vs" : "@"} ${opponentShort}${seasonSuffix}`,
                time: toLocalTimeLabel(game.date),
                description: isHome
                    ? `Home game at ${config.homeVenue}`
                    : `Away game vs the ${opponentFullName}`,
                url: game.links?.[0]?.href ?? config.fallbackUrl,
            });
        }
        caches.set(config.variant, { events, fetchedAt: now });
        return events;
    }
    catch {
        return cached?.events ?? [];
    }
}
export async function getSportsEvents(): Promise<CalendarEventContent[]> {
    if (venue.localPreview)
        return [];
    const [rangers, ...espn] = await Promise.all([
        fetchRangersGames(),
        ...ESPN_TEAMS.map((team) => fetchEspnGames(team)),
    ]);
    return [...rangers, ...espn.flat()];
}
export function getSportsVariant(eventId: string): SportsVariant | null {
    if (eventId.startsWith("rangers-"))
        return "rangers";
    if (eventId.startsWith("cowboys-"))
        return "cowboys";
    if (eventId.startsWith("mavs-"))
        return "mavs";
    if (eventId.startsWith("stars-"))
        return "stars";
    return null;
}
export function getCalendarNoteVariant(eventId: string): SportsVariant | "ticketed" | null {
    const sports = getSportsVariant(eventId);
    if (sports)
        return sports;
    if (eventId.startsWith("ticketed-"))
        return "ticketed";
    return null;
}
