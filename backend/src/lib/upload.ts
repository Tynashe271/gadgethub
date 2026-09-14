import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import logger from './logger.js';
import { retryStrategies } from './retry.js';

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

export interface UploadOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  width: number;
  height: number;
  format: string;
}

export class UploadService {
  private allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  private maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Validate file before upload
   */
  private validateFile(file: { mimetype: string; size: number }): void {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }
  }

  /**
   * Process and optimize image
   */
  private async processImage(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    const { maxWidth = 2000, maxHeight = 2000, quality = 85, format = 'jpeg' } = options;

    let image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if necessary
    if (metadata.width && metadata.width > maxWidth) {
      image = image.resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    if (metadata.height && metadata.height > maxHeight) {
      image = image.resize(null, maxHeight, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    // Convert format and compress
    const processedBuffer = await image
      .toFormat(format, { quality })
      .toBuffer();

    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
    };
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    this.validateFile(file);

    const { folder = 'uploads', format = 'jpeg' } = options;
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const uniqueName = `${baseName}-${randomUUID()}.${format}`;
    const key = `${folder}/${uniqueName}`;

    try {
      // Process image
      const { buffer, width, height } = await this.processImage(file.buffer, options);

      // Upload to S3 with retry
      const result = await retryStrategies.externalApi(async () => {
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET || 'gadgethub-uploads',
          Key: key,
          Body: buffer,
          ContentType: `image/${format}`,
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await s3Client.send(command);
        return { key, size: buffer.length };
      });

      // Generate URL
      const url = await this.getPublicUrl(key);

      logger.info(`File uploaded successfully: ${key} (${buffer.length} bytes)`);

      return {
        url,
        key,
        size: buffer.length,
        width,
        height,
        format,
      };
    } catch (error) {
      logger.error(`Failed to upload file: ${error}`);
      throw new Error(`File upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Array<{ buffer: Buffer; mimetype: string; size: number; originalname: string }>,
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadToS3(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from S3
   */
  async deleteFromS3(key: string): Promise<void> {
    try {
      await retryStrategies.externalApi(async () => {
        const command = new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET || 'gadgethub-uploads',
          Key: key,
        });

        await s3Client.send(command);
      });

      logger.info(`File deleted successfully: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${error}`);
      throw new Error(`File deletion failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || 'gadgethub-uploads',
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error(`Failed to generate presigned URL: ${error}`);
      throw new Error(`Presigned URL generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get public URL for a file
   */
  async getPublicUrl(key: string): Promise<string> {
    const bucket = process.env.S3_BUCKET || 'gadgethub-uploads';
    const endpoint = process.env.S3_ENDPOINT || 'https://s3.amazonaws.com';
    
    // Remove protocol from endpoint if present
    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    
    return `https://${bucket}.${cleanEndpoint}/${key}`;
  }

  /**
   * Validate image dimensions
   */
  async validateDimensions(
    buffer: Buffer,
    minWidth?: number,
    maxWidth?: number,
    minHeight?: number,
    maxHeight?: number
  ): Promise<{ width: number; height: number }> {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (minWidth && width < minWidth) {
      throw new Error(`Image width must be at least ${minWidth}px`);
    }
    if (maxWidth && width > maxWidth) {
      throw new Error(`Image width must not exceed ${maxWidth}px`);
    }
    if (minHeight && height < minHeight) {
      throw new Error(`Image height must be at least ${minHeight}px`);
    }
    if (maxHeight && height > maxHeight) {
      throw new Error(`Image height must not exceed ${maxHeight}px`);
    }

    return { width, height };
  }

  /**
   * Create thumbnail
   */
  async createThumbnail(
    buffer: Buffer,
    size: number = 200,
    quality: number = 80
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .toFormat('jpeg', { quality })
      .toBuffer();
  }

  /**
   * Get file info
   */
  async getFileInfo(buffer: Buffer): Promise<{
    format: string;
    width: number;
    height: number;
    size: number;
    orientation?: number;
  }> {
    const metadata = await sharp(buffer).metadata();
    
    return {
      format: metadata.format || 'unknown',
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: buffer.length,
      orientation: metadata.orientation,
    };
  }
}

export const uploadService = new UploadService();

// Export multer configuration
export const uploadConfig = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // Max 10 files at once
  },
  fileFilter: (req: any, file: any, callback: any) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  },
};