import { Link } from 'react-router-dom';
import { NostrEvent } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, MoreHorizontal, ExternalLink } from 'lucide-react';
import { ZapButton } from '@/components/ZapButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThreadItemProps {
  thread: NostrEvent;
  zapTotal?: number;
  commentCount?: number;
  isLoading?: boolean;
}

// Extract URL from content if present
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

// Get tags from the event
function getEventTags(event: NostrEvent): string[] {
  return event.tags
    .filter(([name]) => name === 't')
    .map(([, value]) => value)
    .slice(0, 3); // Limit to 3 tags
}

export function ThreadItem({ thread, zapTotal = 0, commentCount = 0, isLoading }: ThreadItemProps) {
  const author = useAuthor(thread.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(thread.pubkey);
  const noteId = nip19.noteEncode(thread.id);

  // Get title from tags or use first line of content
  const title = thread.tags.find(([name]) => name === 'title')?.[1]
    || thread.content.split('\n')[0].slice(0, 100);

  const url = extractUrl(thread.content);
  const domain = url ? getDomain(url) : null;
  const tags = getEventTags(thread);
  const timeAgo = formatDistanceToNow(new Date(thread.created_at * 1000), { addSuffix: false });

  return (
    <article className="group flex gap-3 py-3 px-2 sm:px-4 hover:bg-muted/30 transition-colors border-b border-border/50">
      {/* Zap Section */}
      <div className="flex flex-col items-center gap-1 min-w-[44px]">
        <ZapButton
          target={thread}
          className="text-muted-foreground hover:text-amber-500 transition-colors"
          showCount={false}
        />
        <span className={`text-xs font-medium tabular-nums ${zapTotal > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {isLoading ? '...' : zapTotal.toLocaleString()}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Title Row */}
        <div className="flex items-start gap-2 flex-wrap">
          <Link
            to={`/${noteId}`}
            className="font-medium text-foreground hover:text-primary transition-colors leading-snug"
          >
            {title}
          </Link>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-500 hover:underline shrink-0"
            >
              <span className="truncate max-w-[200px]">{domain}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs text-muted-foreground">
          <Link
            to={`/${nip19.npubEncode(thread.pubkey)}`}
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Avatar className="h-4 w-4">
              <AvatarImage src={metadata?.picture} />
              <AvatarFallback className="text-[8px]">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">@{displayName}</span>
          </Link>

          <span>·</span>
          <span>{timeAgo}</span>

          {/* Comment count */}
          <Link
            to={`/${noteId}`}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-1"
          >
            <MessageSquare className="h-3 w-3" />
            <span>{commentCount}</span>
          </Link>

          {/* Tags */}
          {tags.length > 0 && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1 flex-wrap">
                {tags.map((tag) => (
                  <Link key={tag} to={`/t/${tag}`}>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 font-normal hover:bg-secondary/80"
                    >
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-3 w-3" />
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
      </div>
    </article>
  );
}

export function ThreadItemSkeleton() {
  return (
    <div className="flex gap-3 py-3 px-2 sm:px-4 border-b border-border/50 animate-pulse">
      <div className="flex flex-col items-center gap-1 min-w-[44px]">
        <div className="h-6 w-6 rounded bg-muted" />
        <div className="h-3 w-8 rounded bg-muted" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-5 w-3/4 bg-muted rounded" />
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-muted" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-12 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
