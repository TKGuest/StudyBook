/**
 * URL Routing utilities for Facebook-style dynamic Single Post routing.
 * Updates browser address without full page reload:
 * e.g., /post/[post_id] or https://studybook.com/post/[post_id]
 */

export function extractPostIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Path check: /post/:id or /posts/:id
  const pathname = window.location.pathname;
  const pathMatch = pathname.match(/\/(?:post|posts)\/([a-zA-Z0-9_\-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]);
  }

  // Direct unique ID path check: /post_... or /gpost_... or /p_...
  const directPathMatch = pathname.match(/^\/((?:post_|gpost_|p_)[a-zA-Z0-9_\-]+)$/i);
  if (directPathMatch && directPathMatch[1]) {
    return decodeURIComponent(directPathMatch[1]);
  }

  // 2. Query param check: ?post=:id or ?p=:id or ?postId=:id
  const searchParams = new URLSearchParams(window.location.search);
  const qPost = searchParams.get('post') || searchParams.get('p') || searchParams.get('postId');
  if (qPost) {
    return decodeURIComponent(qPost);
  }

  // 3. Hash check: #post/:id or #/post/:id or #post_...
  const hash = window.location.hash;
  const hashMatch = hash.match(/(?:post|posts)?\/?([a-zA-Z0-9_\-]+)/i);
  if (hashMatch && hashMatch[1] && (hashMatch[1].startsWith('p_') || hashMatch[1].startsWith('post_') || hashMatch[1].startsWith('gpost_') || hash.includes('post/'))) {
    return decodeURIComponent(hashMatch[1]);
  }

  return null;
}

export function pushPostUrl(postId: string): void {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  const targetPath = `/post/${postId}`;

  if (currentPath !== targetPath) {
    try {
      window.history.pushState({ postId }, '', targetPath);
    } catch (e) {
      console.warn('Failed to update browser history:', e);
    }
  }
}

export function resetToMainUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    // Return cleanly to root or previous state without /post/:id
    window.history.pushState({}, '', '/');
  } catch (e) {
    console.warn('Failed to reset browser history:', e);
  }
}

export const pushHomeUrl = resetToMainUrl;

export function getFullPostShareUrl(postId: string): string {
  if (typeof window === 'undefined') return `https://studybook.com/post/${postId}`;
  const origin = window.location.origin;
  return `${origin}/post/${postId}`;
}
