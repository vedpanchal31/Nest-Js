import { Inject, Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
  DeleteApiResponse,
  UploadApiOptions,
} from 'cloudinary';
import { Readable } from 'stream';

export class MulterFile {
  buffer: Buffer;
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class CloudinaryService {
  constructor(@Inject('CLOUDINARY') private cloudinaryProvider) {}

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  private getDeliveryBaseUrl(): string {
    return (process.env.CLOUDINARY_DELIVERY_BASE_URL || '').replace(/\/+$/, '');
  }

  async uploadImage(
    file: MulterFile,
    folder?: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(new Error(error.message || 'Upload error'));
          if (result) return resolve(result);
          return reject(new Error('No result returned from Cloudinary'));
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });
  }

  async uploadFile(
    file: MulterFile,
    folder?: string,
    resourceType?: 'auto' | 'image' | 'video' | 'raw',
    options?: UploadApiOptions,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType || 'auto',
          ...options,
        },
        (error, result) => {
          if (error) return reject(new Error(error.message || 'Upload error'));
          if (result) return resolve(result);
          return reject(new Error('No result returned from Cloudinary'));
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });
  }

  async deleteFile(publicId: string): Promise<DeleteApiResponse> {
    return new Promise((resolve, reject) => {
      void cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'image' },
        (
          error: UploadApiErrorResponse | undefined,
          result: DeleteApiResponse | undefined,
        ) => {
          if (error) {
            return reject(
              new Error(this.getErrorMessage(error, 'Delete error')),
            );
          }
          if (result) return resolve(result);
          return reject(new Error('No result returned from Cloudinary'));
        },
      );
    });
  }

  async deleteRawFile(publicId: string): Promise<DeleteApiResponse> {
    return new Promise((resolve, reject) => {
      void cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'raw' },
        (
          error: UploadApiErrorResponse | undefined,
          result: DeleteApiResponse | undefined,
        ) => {
          if (error) {
            return reject(
              new Error(this.getErrorMessage(error, 'Delete error')),
            );
          }
          if (result) return resolve(result);
          return reject(new Error('No result returned from Cloudinary'));
        },
      );
    });
  }

  async deleteVideoFile(publicId: string): Promise<DeleteApiResponse> {
    return new Promise((resolve, reject) => {
      void cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'video' },
        (
          error: UploadApiErrorResponse | undefined,
          result: DeleteApiResponse | undefined,
        ) => {
          if (error) {
            return reject(
              new Error(this.getErrorMessage(error, 'Delete error')),
            );
          }
          if (result) return resolve(result);
          return reject(new Error('No result returned from Cloudinary'));
        },
      );
    });
  }

  getFileUrl(secureUrl: string): string {
    if (!secureUrl) {
      return '';
    }

    const deliveryBaseUrl = this.getDeliveryBaseUrl();
    if (!deliveryBaseUrl) {
      return secureUrl;
    }

    return secureUrl.replace(
      /^https:\/\/res\.cloudinary\.com\/[^/]+/,
      deliveryBaseUrl,
    );
  }

  buildDeliveryUrl(params: {
    publicId: string;
    resourceType: 'image' | 'video' | 'raw';
    version?: string | number;
    format?: string;
  }): string {
    const { publicId, resourceType, version, format } = params;
    if (!publicId) {
      return '';
    }

    const deliveryBaseUrl = this.getDeliveryBaseUrl();
    if (!deliveryBaseUrl) {
      return '';
    }

    const versionSegment = version ? `/v${version}` : '';
    const normalizedPublicId = publicId.replace(/^\/+/, '');
    const needsExtension =
      resourceType !== 'raw' &&
      format &&
      !normalizedPublicId.endsWith(`.${format}`);

    const publicPath = needsExtension
      ? `${normalizedPublicId}.${format}`
      : normalizedPublicId;

    return `${deliveryBaseUrl}/${resourceType}/upload${versionSegment}/${publicPath}`;
  }

  getDownloadUrl(secureUrl: string): string {
    return this.getFileUrl(secureUrl);
  }
}
