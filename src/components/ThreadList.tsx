import { useMemo, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { NostrEvent } from '@nostrify/nostrify';
import { ThreadItem, ThreadItemSkeleton } from './ThreadItem';
import { useThreads, useThreadZaps, useThreadCommentCounts, useZappableAuthors, sortThreads, SortType } from '@/hooks/useThreads';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';

interface ThreadListProps {
  sort: SortType;
}

export function ThreadList({ sort }: ThreadListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useThreads(sort);

  const { ref, inView } = useInView();

  // Flatten and dedupe threads
  const allThreads = useMemo(() => {
    const seen = new Set<string>();
    return data?.pages.flat().filter((event: NostrEvent) => {
      if (!event.id || seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    }) || [];
  }, [data?.pages]);

  // Get unique author pubkeys
  const authorPubkeys = useMemo(() => {
    return [...new Set(allThreads.map(t => t.pubkey))];
  }, [allThreads]);

  // Check which authors are zappable
  const { data: zappableAuthors, isLoading: authorsLoading } = useZappableAuthors(authorPubkeys);

  // Filter to only zappable threads
  const threads = useMemo(() => {
    if (!zappableAuthors) return [];
    return allThreads.filter(t => zappableAuthors.has(t.pubkey));
  }, [allThreads, zappableAuthors]);

  // Get all thread IDs for batch queries
  const threadIds = useMemo(() => threads.map(t => t.id), [threads]);

  // Batch fetch zaps and comment counts
  const { data: zapTotals, isLoading: zapsLoading } = useThreadZaps(threadIds);
  const { data: commentCounts, isLoading: commentsLoading } = useThreadCommentCounts(threadIds);

  // Sort threads based on sort type
  const sortedThreads = useMemo(() => {
    return sortThreads(threads, sort, zapTotals || new Map());
  }, [threads, sort, zapTotals]);

  // Load more when scroll sentinel is visible
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-4">
            <p className="text-destructive font-medium">Failed to load posts</p>
            <p className="text-sm text-muted-foreground">
              Check your relay connections and try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || authorsLoading) {
    return (
      <div className="divide-y divide-border/50">
        {[...Array(10)].map((_, i) => (
          <ThreadItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (sortedThreads.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-4">
            <Flame className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to share something interesting!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {sortedThreads.map((thread) => (
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
    </div>
  );
}
