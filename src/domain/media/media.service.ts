import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CloudinaryService } from 'src/core/cloudinary/cloudinary.service';
import { FILE_PATHS, FilePathKey } from 'src/core/constants/app.constants';
import { Media, MediaType } from './entities/media.entity';
import {
  UploadMediaDto,
  UpdateMediaDto,
  MediaListQueryDto,
  MediaResponseDto,
} from './dtos/media.dto';

@Injectable()
export class MediaService {
  private readonly MAX_FILE_SIZES = {
    [MediaType.IMAGE]: 10 * 1024 * 1024,
    [MediaType.VIDEO]: 100 * 1024 * 1024,
    [MediaType.PDF]: 20 * 1024 * 1024,
    [MediaType.ZIP]: 50 * 1024 * 1024,
    [MediaType.EXCEL]: 10 * 1024 * 1024,
    [MediaType.DOCUMENT]: 20 * 1024 * 1024,
    [MediaType.OTHER]: 10 * 1024 * 1024,
  };

  private readonly ALLOWED_MIME_TYPES = {
    [MediaType.IMAGE]: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    [MediaType.VIDEO]: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/mpeg',
    ],
    [MediaType.PDF]: ['application/pdf'],
    [MediaType.ZIP]: [
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip',
    ],
    [MediaType.EXCEL]: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    [MediaType.DOCUMENT]: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
  };

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private determineMediaType(mimeType: string): MediaType {
    for (const [type, mimeTypes] of Object.entries(this.ALLOWED_MIME_TYPES)) {
      if (mimeTypes.includes(mimeType)) {
        return type as MediaType;
      }
    }
    return MediaType.OTHER;
  }

  private validateFile(file: Express.Multer.File): MediaType {
    const mediaType = this.determineMediaType(file.mimetype);
    if (mediaType === MediaType.OTHER) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed.`,
      );
    }
    const maxSize = this.MAX_FILE_SIZES[mediaType];
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new BadRequestException(
        `File size exceeds maximum ${maxSizeMB}MB for ${mediaType} files.`,
      );
    }
    return mediaType;
  }

  private async cleanupUploadedFiles(mediaList: Media[]): Promise<void> {
    for (const media of mediaList) {
      try {
        if (media.path) {
          await this.deleteFromCloudinary(media);
        }
      } catch (error) {
        console.error(`Failed to cleanup file ${media.path}:`, error);
      }
    }
  }

  private getCloudinaryResourceType(
    mediaType: MediaType,
  ): 'image' | 'video' | 'raw' {
    if (mediaType === MediaType.IMAGE || mediaType === MediaType.PDF) {
      return 'image';
    }

    if (mediaType === MediaType.VIDEO) {
      return 'video';
    }

    return 'raw';
  }

  private buildPublicId(fileName: string, includeExtension: boolean): string {
    const extension = extname(fileName).toLowerCase();
    const baseName = fileName.slice(0, fileName.length - extension.length);
    const safeBaseName =
      baseName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || 'file';

    const safeExtension = extension.replace(/[^a-z0-9.]/g, '');
    return includeExtension
      ? `${Date.now()}-${safeBaseName}${safeExtension}`
      : `${Date.now()}-${safeBaseName}`;
  }

  private buildStoredFileName(fileName: string): string {
    return this.buildPublicId(fileName, true);
  }

  private getDefaultPathKey(mediaType: MediaType): FilePathKey {
    if (mediaType === MediaType.IMAGE) {
      return 'MEDIA_IMAGE';
    }

    if (mediaType === MediaType.VIDEO) {
      return 'MEDIA_VIDEO';
    }

    return 'MEDIA_DOCUMENT';
  }

  private resolveStoragePrefix(
    mediaType: MediaType,
    uploadDto?: UploadMediaDto,
  ): string {
    const pathKey = uploadDto?.pathKey || this.getDefaultPathKey(mediaType);
    const template = FILE_PATHS[pathKey] || FILE_PATHS.MEDIA;

    if (template.includes('#ID#')) {
      if (!uploadDto?.pathId) {
        throw new BadRequestException(
          `pathId is required for storage path key ${pathKey}.`,
        );
      }

      return template.replace(/#ID#/g, uploadDto.pathId.trim());
    }

    return template;
  }

  private toProviderFolder(storagePrefix: string): string {
    return storagePrefix.replace(/^public\//, '');
  }

  private buildStoragePath(storagePrefix: string, fileName: string): string {
    return `${storagePrefix}/${fileName}`;
  }

  private getMediaTypeFromPath(path: string): MediaType {
    const extension = extname(path).toLowerCase();

    if (
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extension)
    ) {
      return MediaType.IMAGE;
    }

    if (
      ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.mpeg'].includes(extension)
    ) {
      return MediaType.VIDEO;
    }

    if (extension === '.pdf') {
      return MediaType.PDF;
    }

    if (['.zip', '.rar', '.7z'].includes(extension)) {
      return MediaType.ZIP;
    }

    if (['.xls', '.xlsx', '.csv'].includes(extension)) {
      return MediaType.EXCEL;
    }

    if (['.doc', '.docx', '.ppt', '.pptx', '.txt'].includes(extension)) {
      return MediaType.DOCUMENT;
    }

    return MediaType.OTHER;
  }

  private getPublicIdFromPath(path: string, mediaType: MediaType): string {
    const providerPath = path.replace(/^public\//, '');

    if (
      mediaType === MediaType.IMAGE ||
      mediaType === MediaType.PDF ||
      mediaType === MediaType.VIDEO
    ) {
      return providerPath.replace(/\.[^.]+$/, '');
    }

    return providerPath;
  }

  private buildUploadPublicId(fileName: string, mediaType: MediaType): string {
    if (
      mediaType === MediaType.IMAGE ||
      mediaType === MediaType.PDF ||
      mediaType === MediaType.VIDEO
    ) {
      return fileName.replace(/\.[^.]+$/, '');
    }

    return fileName;
  }

  private buildMediaUrl(media: Media): string {
    const mediaType = this.getMediaTypeFromPath(media.path);
    const resourceType = this.getCloudinaryResourceType(mediaType);
    const publicId = this.getPublicIdFromPath(media.path, mediaType);
    const format = extname(media.path).replace(/^\./, '') || undefined;

    return this.cloudinaryService.buildDeliveryUrl({
      publicId,
      resourceType,
      format,
    });
  }

  private mapMediaResponse(media: Media): MediaResponseDto {
    return {
      ...media,
      url: this.buildMediaUrl(media),
    };
  }

  private mapMediaListResponse(mediaList: Media[]): MediaResponseDto[] {
    return mediaList.map((item) => this.mapMediaResponse(item));
  }

  private async deleteFromCloudinary(media: Media): Promise<void> {
    const mediaType = this.getMediaTypeFromPath(media.path);
    const resourceType = this.getCloudinaryResourceType(mediaType);
    const cloudinaryPublicId = this.getPublicIdFromPath(media.path, mediaType);

    if (!cloudinaryPublicId) {
      return;
    }

    if (resourceType === 'raw') {
      await this.cloudinaryService.deleteRawFile(cloudinaryPublicId);
      return;
    }

    if (resourceType === 'video') {
      await this.cloudinaryService.deleteVideoFile(cloudinaryPublicId);
      return;
    }

    await this.cloudinaryService.deleteFile(cloudinaryPublicId);
  }

  async uploadFilesPublic(
    files: Express.Multer.File[],
    uploadDto?: UploadMediaDto,
  ): Promise<MediaResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }

    const uploadedMedia: Media[] = [];

    for (const file of files) {
      try {
        const mediaType = this.validateFile(file);
        const resourceType = this.getCloudinaryResourceType(mediaType);
        const storagePrefix = this.resolveStoragePrefix(mediaType, uploadDto);
        const providerFolder = this.toProviderFolder(storagePrefix);
        const storedFileName = this.buildStoredFileName(file.originalname);
        const storagePath = this.buildStoragePath(
          storagePrefix,
          storedFileName,
        );
        const uploadOptions =
          resourceType === 'raw'
            ? undefined
            : {
                public_id: this.buildUploadPublicId(storedFileName, mediaType),
                use_filename: false,
                unique_filename: false,
                overwrite: false,
              };

        const rawUploadOptions =
          resourceType === 'raw'
            ? {
                public_id: this.buildUploadPublicId(storedFileName, mediaType),
                use_filename: false,
                unique_filename: false,
                overwrite: false,
              }
            : undefined;

        await this.cloudinaryService.uploadFile(
          file,
          providerFolder,
          resourceType,
          uploadOptions || rawUploadOptions,
        );

        const media = this.mediaRepository.create({
          path: storagePath,
        });

        const savedMedia = await this.mediaRepository.save(media);
        uploadedMedia.push(savedMedia);
      } catch (error) {
        await this.cleanupUploadedFiles(uploadedMedia);
        throw new BadRequestException(
          `Failed to upload file ${file.originalname}: ${error.message}`,
        );
      }
    }

    return this.mapMediaListResponse(uploadedMedia);
  }

  async findAllPublic(query: MediaListQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.mediaRepository
      .createQueryBuilder('media')
      .where('media.deletedAt IS NULL');

    if (search) {
      queryBuilder.andWhere('media.path ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const total = await queryBuilder.getCount();

    const media = await queryBuilder
      .orderBy('media.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: this.mapMediaListResponse(media),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePublic(id: string): Promise<MediaResponseDto> {
    const media = await this.mediaRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return this.mapMediaResponse(media);
  }

  async updatePublic(
    id: string,
    updateDto: UpdateMediaDto,
  ): Promise<MediaResponseDto> {
    const media = await this.mediaRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    Object.assign(media, updateDto);
    const savedMedia = await this.mediaRepository.save(media);
    return this.mapMediaResponse(savedMedia);
  }

  async removePublic(id: string): Promise<void> {
    const media = await this.mediaRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    await this.mediaRepository.softDelete(id);

    try {
      if (media.path) {
        await this.deleteFromCloudinary(media);
      }
    } catch (error) {
      console.error(
        `Failed to delete file from Cloudinary: ${media.path}`,
        error,
      );
    }
  }

  async getStatsPublic(): Promise<any> {
    const totalFiles = await this.mediaRepository
      .createQueryBuilder('media')
      .where('media.deletedAt IS NULL')
      .getCount();

    return {
      totalFiles,
    };
  }

  async getDownloadUrl(id: string): Promise<string> {
    const media = await this.mediaRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return this.buildMediaUrl(media);
  }
}
