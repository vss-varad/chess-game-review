import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import objectSupport from 'dayjs/plugin/objectSupport';

import { useSelectGameStore } from '../stores/useSelectGameStore';
import { groupChessComLinksByYear, groupLichessLinksByYear } from '../utils/groupChessComLinksByYear';

dayjs.extend(objectSupport);
dayjs.extend(isSameOrBefore);

export default function useGameArchives(username: string) {
  const site = useSelectGameStore(state => state.site)!;

  return useQuery({
    queryKey: ['gameArchives', username, site],
    queryFn: async () =>
      site === 'chess.com' ? fetchChessCom(username) : fetchLichess(username),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

async function fetchChessCom(username: string) {
  const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`);

  if (!response.ok)
    throw new Error(`Chess.com could not load this account’s archives (HTTP ${response.status}).`);

  const result = await response.json() as { archives?: unknown };

  if (!Array.isArray(result.archives) || !result.archives.every(link => typeof link === 'string'))
    throw new Error('Chess.com returned an invalid archive list.');

  return groupChessComLinksByYear(result.archives.reverse());
}

async function fetchLichess(username: string) {
  const response = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`);

  if (!response.ok)
    throw new Error(`Lichess could not load this account (HTTP ${response.status}).`);

  const userInfo = await response.json() as { createdAt?: unknown };
  const createdAt = userInfo.createdAt;

  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt))
    throw new Error('Lichess returned invalid account data.');

  const now = dayjs();
  const created = dayjs(createdAt);

  // round down the created date to start of month
  // .e.g if created at 2016-08-12T14:48:29,
  // createdMonth is 2016-08-01T00:00:00
  const createdMonth = dayjs({
    year: created.year(),
    month: created.month(),
    day: 1,
  });

  // generate UNIX timestamps for all the months inbetween (edge-inclusive)
  const sinceUntil: { since: number; until: number }[] = [];
  let currentMonth = createdMonth; // will increase 1 month each while-loop

  while (currentMonth.isSameOrBefore(now)) {
    const nextMonth = currentMonth.add(1, 'month');

    sinceUntil.unshift({
      since: currentMonth.valueOf(),
      until: nextMonth.valueOf(),
    });

    currentMonth = nextMonth;
  }

  const monthLinks = sinceUntil.map(({ since, until }) => `https://lichess.org/api/games/user/${username}?pgnInJson=true&clocks=true&literate=true&since=${since}&until=${until}`);

  return groupLichessLinksByYear(monthLinks);
}
