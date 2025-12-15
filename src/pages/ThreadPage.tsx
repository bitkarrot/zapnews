import { useSeoMeta } from '@unhead/react';
import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '@/components/Header';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { useThread } from '@/hooks/useThreads';
import { useAuthor } from '@/hooks/useAuthor';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotFound from './NotFound';

// Extract URL from content
function extractUrl(content: string): string | null {
  const urlRegex = /https?:\/\/[^\s]+/;
  const match = content.match(urlRegex);
  return match ? match[0] : null;
}

// Get domain from URL
function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Get content without URL
function getContentWithoutUrl(content: string, url: string | null): string {
  if (!url) return content;
  return content.replace(url, '').trim();
}

// Get tags from the event
function getEventTags(event: { tags: string[][] }): string[] {
  return event.tags
    .filter(([name]) => name === 't')
    .map(([, value]) => value);
}

export function ThreadPage() {
  const { nip19: nip19Id } = useParams<{ nip19: string }>();

  // Decode note ID to event ID
  let eventId: string | undefined;
  let noteId: string | undefined = nip19Id;
  try {
    if (nip19Id) {
      const decoded = nip19.decode(nip19Id);
      if (decoded.type === 'note') {
        eventId = decoded.data;
      } else if (decoded.type === 'nevent') {
        eventId = decoded.data.id;
      }
    }
  } catch {
    // Invalid NIP-19 identifier
  }

  const { data: thread, isLoading, error } = useThread(eventId);
  const author = useAuthor(thread?.pubkey);
  const { webln, activeNWC } = useWallet();
  const { totalSats, isLoading: zapsLoading } = useZaps(
    thread || [],
    webln,
    activeNWC
  );

  // Set meta tags
  const title = thread?.tags.find(([name]) => name === 'title')?.[1] || 'Thread';
  useSeoMeta({
    title: `${title} | Zap News`,
    description: thread?.content.slice(0, 160) || 'View this thread on Zap News',
  });

  if (!eventId) {
    return <NotFound />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto py-4 px-4">
          <ThreadSkeleton />
        </main>
      </div>
    );
  }

  if (error || !thread) {
    return <NotFound />;
  }

  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(thread.pubkey);
  const url = extractUrl(thread.content);
  const domain = url ? getDomain(url) : null;
  const contentWithoutUrl = getContentWithoutUrl(thread.content, url);
  const tags = getEventTags(thread);
  const timeAgo = formatDistanceToNow(new Date(thread.created_at * 1000), { addSuffix: true });

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/${noteId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

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

        {/* Thread Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">
              {title}
            </h1>

            {/* External link */}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-500 hover:underline mt-2"
              >
                <ExternalLink className="h-4 w-4" />
                {domain}
              </a>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Content */}
            {contentWithoutUrl && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <NoteContent event={{ ...thread, content: contentWithoutUrl }} />
              </div>
            )}

            {/* Author & Meta */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t">
              <div className="flex items-center gap-3">
                <Link to={`/${nip19.npubEncode(thread.pubkey)}`}>
                  <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary/30 transition-all">
                    <AvatarImage src={metadata?.picture} />
                    <AvatarFallback>
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link
                    to={`/${nip19.npubEncode(thread.pubkey)}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    @{displayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Link key={tag} to={`/t/${tag}`}>
                      <Badge variant="secondary" className="hover:bg-secondary/80">
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2 border-t">
              {/* Zap */}
              <div className="flex items-center gap-2">
                <ZapButton target={thread} showCount={false} />
                <span className={`text-sm font-medium ${totalSats > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {zapsLoading ? '...' : `${totalSats.toLocaleString()} sats`}
                </span>
              </div>

              {/* Share */}
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>

              {/* More options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${noteId}`)}>
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`nostr:${noteId}`)}>
                    Copy Nostr URI
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <CommentsSection
          root={thread}
          title="Discussion"
          emptyStateMessage="No comments yet"
          emptyStateSubtitle="Be the first to share your thoughts!"
        />
      </main>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-24 mb-4" />
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-40 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex items-center gap-3 pt-4 border-t">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </>
  );
}

export default ThreadPage;
