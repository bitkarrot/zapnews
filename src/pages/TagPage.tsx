import { useSeoMeta } from '@unhead/react';
import { useParams, Link } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { Header } from '@/components/Header';
import { ThreadItem, ThreadItemSkeleton } from '@/components/ThreadItem';
import { useThreadZaps, useThreadCommentCounts } from '@/hooks/useThreads';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Hash } from 'lucide-react';
import { NostrEvent, NostrFilter } from '@nostrify/nostrify';

export function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  const { nostr } = useNostr();
  const { ref, inView } = useInView();

  // Fetch threads with this tag
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['tag-threads', tag],
    queryFn: async ({ pageParam, signal }) => {
      if (!tag) return [];
      
      const filter: NostrFilter = { 
        kinds: [11], 
        '#t': [tag.toLowerCase()],
        limit: 30 
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
    enabled: !!tag,
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
    title: `#${tag} | Zap News`,
    description: `Posts tagged with #${tag} on Zap News`,
  });

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

        {/* Tag header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Hash className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">#{tag}</h1>
            <p className="text-sm text-muted-foreground">
              {threads.length} {threads.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>

        {/* Threads */}
        <div className="bg-card border border-border/50 rounded-lg overflow-hidden shadow-sm">
          {error ? (
            <Card className="border-dashed border-0">
              <CardContent className="py-12 px-8 text-center">
                <p className="text-destructive font-medium">Failed to load posts</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Check your relay connections and try again.
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="divide-y divide-border/50">
              {[...Array(10)].map((_, i) => (
                <ThreadItemSkeleton key={i} />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Hash className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No posts with this tag</p>
              <p className="text-sm mt-2">Be the first to use #{tag}</p>
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

export default TagPage;
