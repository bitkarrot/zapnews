import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ThreadList } from '@/components/ThreadList';
import { SortType } from '@/hooks/useThreads';

const Index = () => {
  const [searchParams] = useSearchParams();
  const sort = (searchParams.get('sort') as SortType) || 'hot';

  useSeoMeta({
    title: 'Zap News - The Front Page of Nostr',
    description: 'A social news platform powered by Nostr and Bitcoin Lightning. Share links, discuss ideas, and earn sats.',
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-4xl mx-auto py-4">
        <div className="bg-card border border-border/50 rounded-lg overflow-hidden shadow-sm">
          <ThreadList sort={sort} />
        </div>
        
        {/* Footer */}
        <footer className="text-center py-8 text-xs text-muted-foreground">
          <p>
            Powered by{' '}
            <a 
              href="https://nostr.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-amber-600 hover:underline"
            >
              Nostr
            </a>
            {' '}•{' '}
            <a 
              href="https://shakespeare.diy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Vibed with Shakespeare
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
