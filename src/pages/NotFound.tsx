import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Home, Zap } from 'lucide-react';

const NotFound = () => {
  useSeoMeta({
    title: 'Page Not Found | Zap News',
    description: 'The page you are looking for could not be found.',
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-muted">
            <Zap className="h-10 w-10 text-amber-500" />
          </div>
          
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-xl text-muted-foreground">
            This page could not be found
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The link you followed may be broken, or the page may have been removed.
          </p>
          
          <Link to="/">
            <Button className="mt-4">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
