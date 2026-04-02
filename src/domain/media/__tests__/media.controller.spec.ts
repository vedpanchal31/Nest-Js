import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from '../media.controller';
import { MediaService } from '../media.service';

describe('MediaController - Comprehensive', () => {
  let controller: MediaController;
  let service: jest.Mocked<MediaService>;

  const mockMedia = {
    id: 'media-uuid',
    path: 'public/media/images/1234567890-test.png',
    url: 'https://cloudinary.com/media/images/1234567890-test.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockMediaService = {
    uploadFilesPublic: jest.fn().mockResolvedValue([mockMedia]),
    findAllPublic: jest.fn().mockResolvedValue({
      data: [mockMedia],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    }),
    findOnePublic: jest.fn().mockResolvedValue(mockMedia),
    updatePublic: jest.fn().mockResolvedValue(mockMedia),
    removePublic: jest.fn().mockResolvedValue(undefined),
    getStatsPublic: jest.fn().mockResolvedValue({ totalFiles: 1 }),
    getDownloadUrl: jest.fn().mockResolvedValue('https://cloudinary.com/media/images/1234567890-test.png'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    service = module.get(MediaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFiles - File Upload Endpoint', () => {
    it('should upload files successfully', async () => {
      const mockFiles = [
        { originalname: 'test.png', mimetype: 'image/png', size: 1024, buffer: Buffer.from('test') },
      ] as Express.Multer.File[];
      const uploadDto = { pathKey: 'MEDIA_IMAGE' as any };

      const result = await controller.uploadFiles(mockFiles, uploadDto);

      expect(service.uploadFilesPublic).toHaveBeenCalledWith(mockFiles, uploadDto);
      expect(result.message).toBe('Files uploaded successfully');
      expect(result.count).toBe(1);
    });

    it('should throw BadRequestException when no files provided', async () => {
      mockMediaService.uploadFilesPublic.mockRejectedValue(new Error('At least one file must be provided'));
      const mockFiles: Express.Multer.File[] = [];

      await expect(controller.uploadFiles(mockFiles)).rejects.toThrow();
    });
  });

  describe('findAll - List Media Endpoint', () => {
    it('should return paginated media list', async () => {
      const query = { page: 1, limit: 20 };

      const result = await controller.findAll(query as any);

      expect(service.findAllPublic).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
    });

    it('should pass search parameter', async () => {
      const query = { page: 1, limit: 20, search: 'test' };

      await controller.findAll(query as any);

      expect(service.findAllPublic).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne - Get Single Media', () => {
    it('should return media by id', async () => {
      const result = await controller.findOne('media-uuid');

      expect(service.findOnePublic).toHaveBeenCalledWith('media-uuid');
      expect(result).toEqual(mockMedia);
    });
  });

  describe('update - Update Media', () => {
    it('should update media metadata', async () => {
      const updateDto = {};

      const result = await controller.update('media-uuid', updateDto);

      expect(service.updatePublic).toHaveBeenCalledWith('media-uuid', updateDto);
      expect(result).toEqual(mockMedia);
    });
  });

  describe('remove - Delete Media', () => {
    it('should delete media', async () => {
      const result = await controller.remove('media-uuid');

      expect(service.removePublic).toHaveBeenCalledWith('media-uuid');
      expect(result.message).toBe('Media file deleted successfully');
    });
  });

  describe('getStats - Media Statistics', () => {
    it('should return media stats', async () => {
      const result = await controller.getStats();

      expect(service.getStatsPublic).toHaveBeenCalled();
      expect(result).toEqual({ totalFiles: 1 });
    });
  });

  describe('getDownloadUrl - Download URL', () => {
    it('should return download URL', async () => {
      const result = await controller.getDownloadUrl('media-uuid');

      expect(service.getDownloadUrl).toHaveBeenCalledWith('media-uuid');
      expect(result.downloadUrl).toBe('https://cloudinary.com/media/images/1234567890-test.png');
    });
  });
});
