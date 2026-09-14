/**
 * Filestack Client Configuration
 * Allows direct, high-speed client uploads to Filestack CDN
 */

export const FILESTACK_API_KEY = (import.meta.env.VITE_FILESTACK_API_KEY as string) || 'AWHaBQM5jQXmoSCdNk3Y3z';

export interface UploadedFileMetadata {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  handle?: string;
}
