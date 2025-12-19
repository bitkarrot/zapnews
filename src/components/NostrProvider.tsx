import React, { useEffect, useRef, useMemo } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Track relay URLs to detect changes
  const relayUrlsKey = useMemo(() => {
    return config.relayMetadata.relays
      .filter(r => r.read)
      .map(r => r.url)
      .sort()
      .join(',');
  }, [config.relayMetadata.relays]);

  // Use ref so the pool always has the latest relay metadata
  const relayMetadata = useRef(config.relayMetadata);
  
  // Update ref when config changes
  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
  }, [config.relayMetadata]);

  // Create NPool - recreate when relays change
  const pool = useMemo(() => {
    return new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters: NostrFilter[]) {
        const routes = new Map<string, NostrFilter[]>();

        // Route to all read relays
        const readRelays = relayMetadata.current.relays
          .filter(r => r.read)
          .map(r => r.url);

        for (const url of readRelays) {
          routes.set(url, filters);
        }

        return routes;
      },
      eventRouter(_event: NostrEvent) {
        // Get write relays from metadata
        const writeRelays = relayMetadata.current.relays
          .filter(r => r.write)
          .map(r => r.url);

        return [...new Set(writeRelays)];
      },
    });
  }, [relayUrlsKey]); // Recreate pool when relay URLs change

  // Invalidate all queries when relays change
  useEffect(() => {
    // Invalidate all data queries to refetch from new relays
    queryClient.invalidateQueries({ queryKey: ['threads'] });
    queryClient.invalidateQueries({ queryKey: ['thread-zaps'] });
    queryClient.invalidateQueries({ queryKey: ['thread-comment-counts'] });
    queryClient.invalidateQueries({ queryKey: ['zappable-authors'] });
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [relayUrlsKey, queryClient]);

  return (
    <NostrContext.Provider value={{ nostr: pool }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;
