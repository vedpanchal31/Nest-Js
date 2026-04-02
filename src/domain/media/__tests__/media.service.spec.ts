import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '../media.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Media, MediaType } from '../entities/media.entity';
import { Repository, IsNull } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';

describe('MediaService - Comprehensive', () => {
  let service: MediaService;
  let mediaRepository: jest.Mocked<Repository<Media>>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  const mockMedia = {
    id: 'media-uuid',
    path: 'public/media/images/1234567890-test.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as Media;

  const mockMediaRepository = {
    create: jest.fn().mockReturnValue(mockMedia),
    save: jest.fn().mockResolvedValue(mockMedia),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([mockMedia]),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockMedia]),
      getCount: jest.fn().mockResolvedValue(1),
    }),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn().mockResolvedValue({
      public_id: 'media/images/1234567890-test',
      secure_url: 'https://cloudinary.com/media/images/1234567890-test.png',
    }),
    deleteFile: jest.fn().mockResolvedValue({ result: 'ok' }),
    deleteRawFile: jest.fn().mockResolvedValue({ result: 'ok' }),
    deleteVideoFile: jest.fn().mockResolvedValue({ result: 'ok' }),
    buildDeliveryUrl: jest.fn().mockReturnValue('https://cloudinary.com/media/images/1234567890-test.png'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: getRepositoryToken(Media),
          useValue: mockMediaRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    mediaRepository = module.get(getRepositoryToken(Media));
    cloudinaryService = module.get(CloudinaryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile - File Validation', () => {
    it('should validate image file', async () => {
      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024 * 1024,
      } as Express.Multer.File;

      // Access private method through any type
      const result = await (service as any).validateFile(mockFile);
      expect(result).toBe(MediaType.IMAGE);
    });

    it('should validate video file', async () => {
      const mockFile = {
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
        size: 10 * 1024 * 1024,
      } as Express.Multer.File;

      const result = await (service as any).validateFile(mockFile);
      expect(result).toBe(MediaType.VIDEO);
    });

    it('should throw BadRequestException for unsupported mime type', async () => {
      const mockFile = {
        originalname: 'test.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
      } as Express.Multer.File;

      try {
        await (service as any).validateFile(mockFile);
        fail('Expected BadRequestException to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('File type application/x-msdownload is not allowed');
      }
    });

    it('should throw BadRequestException for file exceeding max size', async () => {
      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 15 * 1024 * 1024, // 15MB exceeds 10MB limit
      } as Express.Multer.File;

      try {
        await (service as any).validateFile(mockFile);
        fail('Expected BadRequestException to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('File size exceeds maximum');
      }
    });
  });

  describe('getCloudinaryResourceType - Resource Type Mapping', () => {
    it('should return image for IMAGE type', () => {
      const result = (service as any).getCloudinaryResourceType(MediaType.IMAGE);
      expect(result).toBe('image');
    });

    it('should return image for PDF type', () => {
      const result = (service as any).getCloudinaryResourceType(MediaType.PDF);
      expect(result).toBe('image');
    });

    it('should return video for VIDEO type', () => {
      const result = (service as any).getCloudinaryResourceType(MediaType.VIDEO);
      expect(result).toBe('video');
    });

    it('should return raw for ZIP type', () => {
      const result = (service as any).getCloudinaryResourceType(MediaType.ZIP);
      expect(result).toBe('raw');
    });
  });

  describe('uploadFilesPublic - File Upload', () => {
    it('should throw BadRequestException when no files provided', async () => {
      await expect(service.uploadFilesPublic([])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload image file successfully', async () => {
      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const result = await service.uploadFilesPublic([mockFile]);

      expect(cloudinaryService.uploadFile).toHaveBeenCalled();
      expect(mediaRepository.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should cleanup on upload failure', async () => {
      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      cloudinaryService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFilesPublic([mockFile])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllPublic - List Media', () => {
    it('should return paginated media list', async () => {
      const query = { page: 1, limit: 20 };

      const result = await service.findAllPublic(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
    });

    it('should apply search filter', async () => {
      const query = { page: 1, limit: 20, search: 'test' };

      await service.findAllPublic(query);

      const queryBuilder = mediaRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'media.path ILIKE :search',
        { search: '%test%' },
      );
    });

    it('should exclude soft-deleted media', async () => {
      await service.findAllPublic({ page: 1, limit: 20 });

      const queryBuilder = mediaRepository.createQueryBuilder();
      expect(queryBuilder.where).toHaveBeenCalledWith('media.deletedAt IS NULL');
    });
  });

  describe('findOnePublic - Get Single Media', () => {
    it('should return media by id', async () => {
      mediaRepository.findOne.mockResolvedValue(mockMedia);

      const result = await service.findOnePublic('media-uuid');

      expect(mediaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'media-uuid', deletedAt: IsNull() },
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('url');
    });

    it('should throw NotFoundException when media not found', async () => {
      mediaRepository.findOne.mockResolvedValue(null);

      await expect(service.findOnePublic('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePublic - Update Media', () => {
    it('should update media metadata', async () => {
      mediaRepository.findOne.mockResolvedValue(mockMedia);

      const updateDto = {};
      const result = await service.updatePublic('media-uuid', updateDto);

      expect(mediaRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('url');
    });

    it('should throw NotFoundException when media not found', async () => {
      mediaRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePublic('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removePublic - Delete Media', () => {
    it('should soft delete media and cleanup Cloudinary', async () => {
      mediaRepository.findOne.mockResolvedValue(mockMedia);

      await service.removePublic('media-uuid');

      expect(mediaRepository.softDelete).toHaveBeenCalledWith('media-uuid');
      expect(cloudinaryService.deleteFile).toHaveBeenCalled();
    });

    it('should throw NotFoundException when media not found', async () => {
      mediaRepository.findOne.mockResolvedValue(null);

      await expect(service.removePublic('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle Cloudinary cleanup errors gracefully', async () => {
      mediaRepository.findOne.mockResolvedValue(mockMedia);
      cloudinaryService.deleteFile.mockRejectedValue(new Error('Delete failed'));

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      // Should not throw, just log error
      await expect(service.removePublic('media-uuid')).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStatsPublic - Media Statistics', () => {
    it('should return total file count', async () => {
      const result = await service.getStatsPublic();

      expect(result).toHaveProperty('totalFiles', 1);
    });

    it('should exclude soft-deleted files from count', async () => {
      await service.getStatsPublic();

      const queryBuilder = mediaRepository.createQueryBuilder();
      expect(queryBuilder.where).toHaveBeenCalledWith('media.deletedAt IS NULL');
    });
  });

  describe('getDownloadUrl - Generate Download URL', () => {
    it('should return download URL for media', async () => {
      mediaRepository.findOne.mockResolvedValue(mockMedia);

      const result = await service.getDownloadUrl('media-uuid');

      expect(result).toBe('https://cloudinary.com/media/images/1234567890-test.png');
    });

    it('should throw NotFoundException when media not found', async () => {
      mediaRepository.findOne.mockResolvedValue(null);

      await expect(service.getDownloadUrl('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('determineMediaType - MIME Type Detection', () => {
    it('should detect image mime types', () => {
      const result = (service as any).determineMediaType('image/png');
      expect(result).toBe(MediaType.IMAGE);
    });

    it('should detect video mime types', () => {
      const result = (service as any).determineMediaType('video/mp4');
      expect(result).toBe(MediaType.VIDEO);
    });

    it('should detect PDF mime type', () => {
      const result = (service as any).determineMediaType('application/pdf');
      expect(result).toBe(MediaType.PDF);
    });

    it('should return OTHER for unknown mime types', () => {
      const result = (service as any).determineMediaType('application/unknown');
      expect(result).toBe(MediaType.OTHER);
    });
  });

  describe('getMediaTypeFromPath - Extension Detection', () => {
    it('should detect image from extension', () => {
      const result = (service as any).getMediaTypeFromPath('test.jpg');
      expect(result).toBe(MediaType.IMAGE);
    });

    it('should detect video from extension', () => {
      const result = (service as any).getMediaTypeFromPath('test.mp4');
      expect(result).toBe(MediaType.VIDEO);
    });

    it('should detect PDF from extension', () => {
      const result = (service as any).getMediaTypeFromPath('test.pdf');
      expect(result).toBe(MediaType.PDF);
    });

    it('should detect ZIP from extension', () => {
      const result = (service as any).getMediaTypeFromPath('test.zip');
      expect(result).toBe(MediaType.ZIP);
    });

    it('should detect Excel from extension', () => {
      const result = (service as any).getMediaTypeFromPath('test.xlsx');
      expect(result).toBe(MediaType.EXCEL);
    });

    it('should detect Document from extension', () => {
      const result = (service as any).getMediaTypeFromPath('test.docx');
      expect(result).toBe(MediaType.DOCUMENT);
    });

    it('should return OTHER for unknown extension', () => {
      const result = (service as any).getMediaTypeFromPath('test.unknown');
      expect(result).toBe(MediaType.OTHER);
    });
  });
});
