import { Inject, Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

export interface MulterFile {
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
}
