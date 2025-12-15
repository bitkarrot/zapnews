import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Link as LinkIcon, FileText, Loader2 } from 'lucide-react';

interface CreatePostDialogProps {
  children: React.ReactNode;
}

export function CreatePostDialog({ children }: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'link' | 'text'>('link');

  const { user } = useCurrentUser();
  const { mutateAsync: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your post.',
        variant: 'destructive',
      });
      return;
    }

    // Build content - for link posts, include URL; for text posts, use content
    let postContent = '';
    if (postType === 'link' && url.trim()) {
      postContent = url.trim();
      if (content.trim()) {
        postContent += '\n\n' + content.trim();
      }
    } else {
      postContent = content.trim();
    }

    // Build tags array
    const eventTags: string[][] = [
      ['title', title.trim()],
    ];

    // Add hashtags
    for (const tag of tags) {
      eventTags.push(['t', tag]);
    }

    // Add URL as 'r' tag if present
    if (postType === 'link' && url.trim()) {
      eventTags.push(['r', url.trim()]);
    }

    try {
      const result = await createEvent({
        kind: 11,
        content: postContent,
        tags: eventTags,
      });

      toast({
        title: 'Post created!',
        description: 'Your post has been published.',
      });

      // Reset form
      setTitle('');
      setUrl('');
      setContent('');
      setTags([]);
      setOpen(false);

      // Navigate to the new post
      if (result) {
        navigate(`/${nip19.noteEncode(result.id)}`);
      }
    } catch (error) {
      toast({
        title: 'Failed to create post',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share a link or start a discussion
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>You must be logged in to create a post.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Post Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={postType === 'link' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPostType('link')}
                className="flex-1"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link
              </Button>
              <Button
                type="button"
                variant={postType === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPostType('text')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Text
              </Button>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter a descriptive title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* URL (for link posts) */}
            {postType === 'link' && (
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                {postType === 'link' ? 'Comment (optional)' : 'Content'}
              </Label>
              <Textarea
                id="content"
                placeholder={postType === 'link' ? 'Add your thoughts...' : 'Start a discussion...'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (up to 5)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={tags.length >= 5}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={handleAddTag}
                  disabled={tags.length >= 5}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !title.trim()}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
