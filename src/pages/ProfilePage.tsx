import { useSeoMeta } from '@unhead/react';
import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { Header } from '@/components/Header';
import { ThreadItem, ThreadItemSkeleton } from '@/components/ThreadItem';
import { useAuthor } from '@/hooks/useAuthor';
import { useThreadZaps, useThreadCommentCounts } from '@/hooks/useThreads';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Zap,
  Link as LinkIcon,
  Edit,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NotFound from './NotFound';
import { NostrEvent, NostrFilter } from '@nostrify/nostrify';

export function ProfilePage() {
  const { nip19: nip19Id } = useParams<{ nip19: string }>();
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { ref, inView } = useInView();

  // Decode npub to pubkey
  let pubkey: string | undefined;
  try {
    if (nip19Id) {
      const decoded = nip19.decode(nip19Id);
      if (decoded.type === 'npub') {
        pubkey = decoded.data;
      } else if (decoded.type === 'nprofile') {
        pubkey = decoded.data.pubkey;
      }
    }
  } catch {
    // Invalid NIP-19 identifier
  }

  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? (pubkey ? genUserName(pubkey) : 'Unknown');
  const isOwnProfile = user?.pubkey === pubkey;

  // Fetch user's threads
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: threadsLoading,
  } = useInfiniteQuery({
    queryKey: ['user-threads', pubkey],
    queryFn: async ({ pageParam, signal }) => {
      if (!pubkey) return [];

      const filter: NostrFilter = {
        kinds: [11],
        authors: [pubkey],
        limit: 20
      };

      if (pageParam) {
        filter.until = pageParam;
      }

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(5000)])
      });

      return events;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at - 1;
    },
    initialPageParam: undefined as number | undefined,
    enabled: !!pubkey,
  });

  // Flatten and dedupe threads
  const threads = useMemo(() => {
    const seen = new Set<string>();
    return data?.pages.flat().filter((event: NostrEvent) => {
      if (!event.id || seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    }) || [];
  }, [data?.pages]);

  // Get thread IDs for batch queries
  const threadIds = useMemo(() => threads.map(t => t.id), [threads]);
  const { data: zapTotals, isLoading: zapsLoading } = useThreadZaps(threadIds);
  const { data: commentCounts, isLoading: commentsLoading } = useThreadCommentCounts(threadIds);

  // Load more when scroll sentinel is visible
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useSeoMeta({
    title: `${displayName} | Zap News`,
    description: metadata?.about?.slice(0, 160) || `View ${displayName}'s profile on Zap News`,
  });

  if (!pubkey) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl mx-auto py-4 px-4">
        {/* Back button */}
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to feed
          </Button>
        </Link>

        {/* Profile Card */}
        <Card className="mb-6">
          {/* Banner */}
          {metadata?.banner && (
            <div className="h-32 sm:h-48 overflow-hidden rounded-t-lg">
              <img
                src={metadata.banner}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <CardHeader className={`pb-3 ${metadata?.banner ? '-mt-12' : ''}`}>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div className="flex items-end gap-4">
                <Avatar className={`h-20 w-20 border-4 border-background ${metadata?.banner ? 'shadow-lg' : ''}`}>
                  <AvatarImage src={metadata?.picture} />
                  <AvatarFallback className="text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-1">
                  <h1 className="text-xl sm:text-2xl font-bold">{displayName}</h1>
                  {metadata?.nip05 && (
                    <p className="text-sm text-muted-foreground">{metadata.nip05}</p>
                  )}
                </div>
              </div>

              {isOwnProfile && (
                <Link to="/settings/profile">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1.5" />
                    Edit Profile
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Bio */}
            {metadata?.about && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {metadata.about}
              </p>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-4 text-sm">
              {metadata?.website && (
                <a
                  href={metadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sky-600 hover:underline"
                >
                  <LinkIcon className="h-4 w-4" />
                  {new URL(metadata.website).hostname}
                </a>
              )}
              {(metadata?.lud16 || metadata?.lud06) && (
                <span className="inline-flex items-center gap-1.5 text-amber-600">
                  <Zap className="h-4 w-4" />
                  {metadata.lud16 || 'Lightning enabled'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User's Threads */}
        <h2 className="text-lg font-semibold mb-4">Posts by {displayName}</h2>

        <div className="bg-card border border-border/50 rounded-lg overflow-hidden shadow-sm">
          {threadsLoading ? (
            <div className="divide-y divide-border/50">
              {[...Array(5)].map((_, i) => (
                <ThreadItemSkeleton key={i} />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No posts yet</p>
            </div>
          ) : (
            <>
              {threads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  zapTotal={zapTotals?.get(thread.id) || 0}
                  commentCount={commentCounts?.get(thread.id) || 0}
                  isLoading={zapsLoading || commentsLoading}
                />
              ))}

              {/* Load more sentinel */}
              {hasNextPage && (
                <div ref={ref} className="py-4">
                  {isFetchingNextPage && (
                    <div className="space-y-0">
                      {[...Array(3)].map((_, i) => (
                        <ThreadItemSkeleton key={i} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
