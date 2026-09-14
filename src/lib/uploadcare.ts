/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { uploadFile } from '@uploadcare/upload-client';

/**
 * Uploadcare Configuration for StudyBook
 * Supports student-focused academic file uploads up to 25 MB with permanent global CDN links.
 */
export const UPLOADCARE_PUBLIC_KEY = 
  (import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY as string) || 'ca259eea4a64277490da';

// Strict file size limitation: 25 MB in bytes
export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 26,214,400 bytes

// Student-focused media types: Images (JPEG, PNG), PDFs, Word (.docx), PowerPoint (.pptx)
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint' // .ppt
];

export const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.doc', '.pptx', '.ppt'];

export const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(',') + ',' + ACCEPTED_MIME_TYPES.join(',');

export interface UploadedAssetMetadata {
  url: string;
  cdnUrl: string;
  uuid: string;
  filename: string;
  mimetype: string;
  size: number;
  type: 'image' | 'pdf' | 'doc' | 'file';
  formattedSize: string;
}

/**
 * Format raw bytes into human readable string (KB, MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validates a selected file against student media types and the strict 25 MB community limit.
 * Intercepts the file BEFORE any bytes are sent to the cloud.
 */
export function validateStudentFile(file: File): { valid: boolean; error?: string; sizeMB: number } {
  const sizeMB = file.size / (1024 * 1024);

  // 1. Strict File Size Validation (Max 25 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      sizeMB,
      error: `File "${file.name}" (${sizeMB.toFixed(1)} MB) exceeds the maximum allowed 25 MB community limit. Upload blocked to protect resources.`
    };
  }

  // 2. Student-focused Media Type Validation
  const lowerName = file.name.toLowerCase();
  const lowerType = file.type.toLowerCase();

  const hasValidExtension = ACCEPTED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  const hasValidMime = ACCEPTED_MIME_TYPES.some(m => lowerType.includes(m.toLowerCase()));

  if (!hasValidExtension && !hasValidMime) {
    return {
      valid: false,
      sizeMB,
      error: `"${file.name}" is not a supported student media file. Accepted formats: Images (JPEG, PNG), PDFs, Word documents (.docx), and PowerPoint presentations (.pptx).`
    };
  }

  return { valid: true, sizeMB };
}

/**
 * Determines academic attachment type for Post data model
 */
export function resolveAttachmentType(filename: string, mimetype?: string): 'image' | 'pdf' | 'doc' | 'file' {
  const name = filename.toLowerCase();
  const mime = (mimetype || '').toLowerCase();

  if (mime.includes('image/') || name.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
    return 'image';
  }
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    mime.includes('word') || 
    mime.includes('presentation') || 
    mime.includes('powerpoint') || 
    name.match(/\.(docx|doc|pptx|ppt)$/)
  ) {
    return 'doc';
  }
  return 'file';
}

/**
 * Direct high-speed upload to Uploadcare via official upload client
 * Handles automatic cloud transfer with progress reporting and constructs permanent CDN URLs
 */
export async function uploadToUploadcare(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedAssetMetadata> {
  // Pre-upload validation check
  const validation = validateStudentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'File validation failed.');
  }

  // Live automated cloud transfer via Uploadcare
  const result = await uploadFile(file, {
    publicKey: UPLOADCARE_PUBLIC_KEY,
    store: 'auto',
    metadata: {
      app: 'StudyBook',
      filename: file.name
    },
    onProgress: (progressInfo) => {
      if (onProgress && 'value' in progressInfo && typeof progressInfo.value === 'number') {
        onProgress(Math.round(progressInfo.value * 100));
      }
    }
  });

  // Construct permanent, direct Uploadcare CDN URL with original filename for clean downloads
  const baseCdnUrl = result.cdnUrl || `https://ucarecdn.com/${result.uuid}/`;
  // Append clean filename to CDN URL for semantic downloading and browser rendering
  const permDownloadUrl = `${baseCdnUrl.replace(/\/$/, '')}/${encodeURIComponent(file.name)}`;

  const resolvedType = resolveAttachmentType(file.name, file.type);

  return {
    url: permDownloadUrl,
    cdnUrl: baseCdnUrl,
    uuid: result.uuid,
    filename: file.name,
    mimetype: file.type || 'application/octet-stream',
    size: file.size,
    type: resolvedType,
    formattedSize: formatBytes(file.size)
  };
}
