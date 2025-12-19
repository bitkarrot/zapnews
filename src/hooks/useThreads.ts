import { useNostr } from '@nostrify/react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { NostrEvent, NostrFilter, NostrMetadata } from '@nostrify/nostrify';

export type SortType = 'hot' | 'recent' | 'top';

// Hot ranking algorithm inspired by Hacker News
function getHotScore(event: NostrEvent, zapTotal: number): number {
  const ageInHours = (Date.now() / 1000 - event.created_at) / 3600;
  const gravity = 1.8;
  // Use zap total (in sats) as the score, with a minimum of 1
  const points = Math.max(1, zapTotal / 1000); // Convert millisats-like to sats
  return points / Math.pow(ageInHours + 2, gravity);
}

export function useThreads(sort: SortType = 'hot') {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['threads', sort],
    queryFn: async ({ pageParam, signal }) => {
      // Query for both kind 11 (threads with titles) and kind 1 (regular notes)
      // Kind 11 is preferred but kind 1 gives us more content
      const filter: NostrFilter = { kinds: [11, 1], limit: 50 };

      if (pageParam) {
        filter.until = pageParam;
      }

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)])
      });

      // Filter out replies (events with 'e' tags that reference other events)
      // We only want top-level posts
      const topLevelPosts = events.filter(event => {
        // Check if this is a reply to another event
        const hasReplyTag = event.tags.some(([name, , , marker]) =>
          name === 'e' && (marker === 'reply' || marker === 'root')
        );
        // Also check for simple 'e' tag without marker (older style replies)
        const hasSimpleReplyTag = event.tags.some(([name]) => name === 'e');

        // For kind 1, filter out replies
        if (event.kind === 1) {
          return !hasReplyTag && !hasSimpleReplyTag;
        }

        // For kind 11, include all (they're threads)
        return true;
      });

      return topLevelPosts;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at - 1;
    },
    initialPageParam: undefined as number | undefined,
  });
}

// Hook to check if authors are zappable (have lud16 or lud06)
export function useZappableAuthors(pubkeys: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['zappable-authors', pubkeys.sort().join(',')],
    queryFn: async (c) => {
      if (pubkeys.length === 0) return new Set<string>();

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Fetch kind 0 metadata for all authors
      const metadataEvents = await nostr.query([{
        kinds: [0],
        authors: pubkeys,
      }], { signal });

      // Build a set of zappable pubkeys
      const zappablePubkeys = new Set<string>();

      // Group by pubkey and get the latest metadata
      const latestMetadata = new Map<string, NostrEvent>();
      for (const event of metadataEvents) {
        const existing = latestMetadata.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          latestMetadata.set(event.pubkey, event);
        }
      }

      // Check each author for lightning address
      for (const [pubkey, event] of latestMetadata) {
        try {
          const metadata: NostrMetadata = JSON.parse(event.content);
          if (metadata.lud16 || metadata.lud06) {
            zappablePubkeys.add(pubkey);
          }
        } catch {
          // Invalid metadata, skip
        }
      }

      return zappablePubkeys;
    },
    enabled: pubkeys.length > 0,
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useThread(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['thread', eventId],
    queryFn: async (c) => {
      if (!eventId) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      // Query for both kind 11 (threads) and kind 1 (notes)
      const events = await nostr.query([{ ids: [eventId], kinds: [11, 1] }], { signal });

      return events[0] || null;
    },
    enabled: !!eventId,
  });
}

export function useThreadZaps(eventIds: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['thread-zaps', eventIds],
    queryFn: async (c) => {
      if (eventIds.length === 0) return new Map<string, number>();

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query zap receipts for all events at once
      const zapEvents = await nostr.query([{
        kinds: [9735],
        '#e': eventIds,
      }], { signal });

      // Build a map of event ID to total sats
      const zapTotals = new Map<string, number>();

      for (const zap of zapEvents) {
        const eTag = zap.tags.find(([name]) => name === 'e')?.[1];
        if (!eTag) continue;

        let sats = 0;

        // Try to extract amount from bolt11
        const bolt11 = zap.tags.find(([name]) => name === 'bolt11')?.[1];
        if (bolt11) {
          try {
            const { nip57 } = await import('nostr-tools');
            sats = nip57.getSatoshisAmountFromBolt11(bolt11);
          } catch {
            // Try amount tag as fallback
            const amountTag = zap.tags.find(([name]) => name === 'amount')?.[1];
            if (amountTag) {
              sats = Math.floor(parseInt(amountTag) / 1000);
            }
          }
        } else {
          // Try amount tag
          const amountTag = zap.tags.find(([name]) => name === 'amount')?.[1];
          if (amountTag) {
            sats = Math.floor(parseInt(amountTag) / 1000);
          }
        }

        const current = zapTotals.get(eTag) || 0;
        zapTotals.set(eTag, current + sats);
      }

      return zapTotals;
    },
    enabled: eventIds.length > 0,
    staleTime: 30000,
  });
}

export function useThreadCommentCounts(eventIds: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['thread-comment-counts', eventIds],
    queryFn: async (c) => {
      if (eventIds.length === 0) return new Map<string, number>();

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query both NIP-22 comments (kind 1111) and regular replies (kind 1)
      const [nip22Comments, regularReplies] = await Promise.all([
        nostr.query([{
          kinds: [1111],
          '#E': eventIds,
        }], { signal }),
        nostr.query([{
          kinds: [1],
          '#e': eventIds,
        }], { signal }),
      ]);

      // Build a map of event ID to comment count
      const commentCounts = new Map<string, number>();

      // Count NIP-22 comments
      for (const comment of nip22Comments) {
        const eTag = comment.tags.find(([name]) => name === 'E')?.[1];
        if (!eTag) continue;

        const current = commentCounts.get(eTag) || 0;
        commentCounts.set(eTag, current + 1);
      }

      // Count regular replies
      for (const reply of regularReplies) {
        const eTag = reply.tags.find(([name]) => name === 'e')?.[1];
        if (!eTag) continue;

        const current = commentCounts.get(eTag) || 0;
        commentCounts.set(eTag, current + 1);
      }

      return commentCounts;
    },
    enabled: eventIds.length > 0,
    staleTime: 30000,
  });
}

export function sortThreads(
  threads: NostrEvent[],
  sort: SortType,
  zapTotals: Map<string, number>
): NostrEvent[] {
  const sorted = [...threads];

  switch (sort) {
    case 'hot':
      return sorted.sort((a, b) => {
        const scoreA = getHotScore(a, zapTotals.get(a.id) || 0);
        const scoreB = getHotScore(b, zapTotals.get(b.id) || 0);
        return scoreB - scoreA;
      });
    case 'recent':
      return sorted.sort((a, b) => b.created_at - a.created_at);
    case 'top':
      return sorted.sort((a, b) => {
        const satsA = zapTotals.get(a.id) || 0;
        const satsB = zapTotals.get(b.id) || 0;
        return satsB - satsA;
      });
    default:
      return sorted;
  }
}
