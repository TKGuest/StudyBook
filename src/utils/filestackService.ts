import * as filestack from 'filestack-js';

export const FILESTACK_API_KEY = 'AWHaBQM5jQXmoSCdNk3Y3z';

let filestackClient: filestack.Client | null = null;

export const getFilestackClient = (): filestack.Client => {
  if (!filestackClient) {
    filestackClient = filestack.init(FILESTACK_API_KEY);
  }
  return filestackClient;
};

export interface FilestackUploadResult {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * Opens the native Filestack File Picker modal for uploading images, videos, and academic documents.
 */
export const openFilestackPicker = (options?: {
  accept?: string[];
  maxFiles?: number;
  fromSources?: string[];
  onSuccess?: (result: FilestackUploadResult) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}): void => {
  try {
    const client = getFilestackClient();
    const picker = client.picker({
      accept: options?.accept || [
        'image/*', 
        'video/*', 
        'application/pdf', 
        '.doc', 
        '.docx', 
        '.ppt', 
        '.pptx', 
        '.xls', 
        '.xlsx', 
        '.txt'
      ],
      maxFiles: options?.maxFiles || 1,
      fromSources: (options?.fromSources as any) || ['local_file_system', 'url', 'webcam', 'googledrive', 'dropbox'],
      onUploadDone: (res) => {
        if (res.filesUploaded && res.filesUploaded.length > 0) {
          const file = res.filesUploaded[0];
          options?.onSuccess?.({
            url: file.url,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size
          });
        }
      },
      onCancel: () => {
        options?.onCancel?.();
      }
    });
    picker.open();
  } catch (err) {
    console.error('Failed to open Filestack picker:', err);
    options?.onError?.(err);
  }
};

/**
 * Direct file upload helper using Filestack SDK.
 */
export const uploadFileViaFilestack = async (file: File): Promise<FilestackUploadResult> => {
  const client = getFilestackClient();
  const res = await client.upload(file);
  return {
    url: res.url,
    filename: res.filename,
    mimetype: res.mimetype,
    size: res.size
  };
};
