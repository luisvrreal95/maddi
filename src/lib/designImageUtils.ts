import { supabase } from '@/integrations/supabase/client';

/**
 * Parse design image paths from ad_design_url field.
 * Handles both legacy public URLs and new private bucket paths.
 */
export const parseDesignPaths = (adDesignUrl: string | null | undefined): string[] => {
  if (!adDesignUrl) return [];
  try {
    const parsed = JSON.parse(adDesignUrl);
    return Array.isArray(parsed) ? parsed : [adDesignUrl];
  } catch {
    return adDesignUrl.startsWith('http') ? [adDesignUrl] : adDesignUrl ? [adDesignUrl] : [];
  }
};

/**
 * Check if a path is a legacy public URL or a private bucket path.
 */
const isPublicUrl = (path: string): boolean => path.startsWith('http');

/**
 * Resolve design image paths to displayable URLs.
 * Legacy public URLs are returned as-is.
 * Private paths are resolved via signed URLs (1 hour expiry).
 */
export const resolveDesignImageUrls = async (paths: string[]): Promise<string[]> => {
  const results: string[] = [];

  for (const path of paths) {
    if (isPublicUrl(path)) {
      results.push(path);
    } else {
      // Private bucket path - generate signed URL
      const { data, error } = await supabase.storage
        .from('campaign-designs')
        .createSignedUrl(path, 3600); // 1 hour

      if (data?.signedUrl) {
        results.push(data.signedUrl);
      } else {
        console.error('Failed to create signed URL for:', path, error);
      }
    }
  }

  return results;
};

/**
 * Upload a design image to the private campaign-designs bucket.
 * Returns the storage path (not a public URL).
 */
export const uploadDesignImage = async (
  file: File,
  userId: string
): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('campaign-designs')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  return data.path;
};

/**
 * Delete a design image from the private bucket.
 */
export const deleteDesignImage = async (path: string): Promise<boolean> => {
  if (isPublicUrl(path)) return false; // Can't delete legacy public URLs from here
  
  const { error } = await supabase.storage
    .from('campaign-designs')
    .remove([path]);

  return !error;
};
