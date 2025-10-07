import { useCallback, useEffect, useState } from 'react';
import { SiteContent } from '../types';
import { api } from '../services/api';
import { DEFAULT_SITE_CONTENT, resolveSiteContent } from '../utils/siteContent';

let lastResolvedContent: SiteContent | null = null;

interface UseSiteContentResult {
  content: SiteContent | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateContent: (next: SiteContent) => Promise<SiteContent>;
}

const useSiteContent = (): UseSiteContentResult => {
  const [content, setContent] = useState<SiteContent | null>(lastResolvedContent);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await api.getSiteContent();
      const resolved = resolveSiteContent(remote ?? undefined);
      lastResolvedContent = resolved;
      setContent(resolved);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch site content', err);
      lastResolvedContent = DEFAULT_SITE_CONTENT;
      setContent(DEFAULT_SITE_CONTENT);
      setError(err instanceof Error ? err.message : 'Impossible de charger le contenu du site.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateContent = useCallback(async (next: SiteContent) => {
    const updated = await api.updateSiteContent(next);
    const resolved = resolveSiteContent(updated);
    setContent(resolved);
    lastResolvedContent = resolved;
    return resolved;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    content,
    loading,
    error,
    refresh,
    updateContent,
  };
};

export default useSiteContent;
export { DEFAULT_SITE_CONTENT };
