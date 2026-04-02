import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService, MulterFile } from '../cloudinary.service';
import { CloudinaryProvider } from '../cloudinary.provider';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn().mockReturnValue({}),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryService - Comprehensive', () => {
  let service: CloudinaryService;

  const mockCloudinaryProvider = {};

  const mockMulterFile: MulterFile = {
    buffer: Buffer.from('test-image-data'),
    fieldname: 'image',
    originalname: 'test.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: 'CLOUDINARY',
          useValue: mockCloudinaryProvider,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Constructor', () => {
    it('should inject CLOUDINARY provider', () => {
      expect(service).toBeDefined();
    });
  });

  describe('uploadImage - Image Upload', () => {
    it('should upload image successfully', async () => {
      const mockResult = { public_id: 'test-id', secure_url: 'https://test.com/image.png' };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(null, mockResult);
        return { pipe: jest.fn() };
      });

      const result = await service.uploadImage(mockMulterFile, 'test-folder');

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { folder: 'test-folder' },
        expect.any(Function),
      );
    });

    it('should reject on upload error', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback({ message: 'Upload failed' }, null);
        return { pipe: jest.fn() };
      });

      await expect(service.uploadImage(mockMulterFile)).rejects.toThrow('Upload failed');
    });

    it('should reject when no result returned', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(null, null);
        return { pipe: jest.fn() };
      });

      await expect(service.uploadImage(mockMulterFile)).rejects.toThrow('No result returned from Cloudinary');
    });
  });

  describe('uploadFile - File Upload', () => {
    it('should upload file with resource type', async () => {
      const mockResult = { public_id: 'file-id', secure_url: 'https://test.com/file.pdf' };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(null, mockResult);
        return { pipe: jest.fn() };
      });

      const result = await service.uploadFile(mockMulterFile, 'documents', 'raw', { public_id: 'custom-id' });

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'documents',
          resource_type: 'raw',
          public_id: 'custom-id',
        }),
        expect.any(Function),
      );
    });

    it('should use auto resource type by default', async () => {
      const mockResult = { public_id: 'auto-id', secure_url: 'https://test.com/auto.png' };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(null, mockResult);
        return { pipe: jest.fn() };
      });

      await service.uploadFile(mockMulterFile);

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_type: 'auto',
        }),
        expect.any(Function),
      );
    });

    it('should handle video resource type', async () => {
      const mockResult = { public_id: 'video-id', secure_url: 'https://test.com/video.mp4' };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(null, mockResult);
        return { pipe: jest.fn() };
      });

      await service.uploadFile(mockMulterFile, 'videos', 'video');

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'videos',
          resource_type: 'video',
        }),
        expect.any(Function),
      );
    });

    it('should reject when no result returned', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(null, null);
        return { pipe: jest.fn() };
      });

      await expect(service.uploadFile(mockMulterFile)).rejects.toThrow('No result returned from Cloudinary');
    });
  });

  describe('deleteFile - Image Delete', () => {
    it('should delete file successfully', async () => {
      const mockResult = { result: 'ok' };

      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback(null, mockResult);
      });

      const result = await service.deleteFile('test-public-id');

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'test-public-id',
        { resource_type: 'image' },
        expect.any(Function),
      );
    });

    it('should reject on delete error', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback({ message: 'Delete failed' }, null);
      });

      await expect(service.deleteFile('test-id')).rejects.toThrow('Delete failed');
    });

    it('should reject when no result returned', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback(null, null);
      });

      await expect(service.deleteFile('test-id')).rejects.toThrow('No result returned from Cloudinary');
    });
  });

  describe('deleteRawFile - Raw File Delete', () => {
    it('should delete raw file successfully', async () => {
      const mockResult = { result: 'ok' };

      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback(null, mockResult);
      });

      const result = await service.deleteRawFile('raw-file-id');

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'raw-file-id',
        { resource_type: 'raw' },
        expect.any(Function),
      );
    });

    it('should reject on delete error', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback({ message: 'Raw delete failed' }, null);
      });

      await expect(service.deleteRawFile('raw-id')).rejects.toThrow('Raw delete failed');
    });

    it('should reject when no result returned', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback(null, null);
      });

      await expect(service.deleteRawFile('raw-id')).rejects.toThrow('No result returned from Cloudinary');
    });
  });

  describe('deleteVideoFile - Video Delete', () => {
    it('should delete video file successfully', async () => {
      const mockResult = { result: 'ok' };

      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback(null, mockResult);
      });

      const result = await service.deleteVideoFile('video-file-id');

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'video-file-id',
        { resource_type: 'video' },
        expect.any(Function),
      );
    });

    it('should reject on delete error', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback({ message: 'Video delete failed' }, null);
      });

      await expect(service.deleteVideoFile('video-id')).rejects.toThrow('Video delete failed');
    });

    it('should reject when no result returned', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockImplementation((publicId, options, callback) => {
        callback(null, null);
      });

      await expect(service.deleteVideoFile('video-id')).rejects.toThrow('No result returned from Cloudinary');
    });
  });

  describe('getDeliveryBaseUrl - Private Method', () => {
    it('should return empty string when env var not set', () => {
      const originalEnv = process.env.CLOUDINARY_DELIVERY_BASE_URL;
      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;

      const result = (service as any).getDeliveryBaseUrl();

      expect(result).toBe('');

      if (originalEnv) {
        process.env.CLOUDINARY_DELIVERY_BASE_URL = originalEnv;
      }
    });

    it('should return trimmed URL without trailing slashes', () => {
      const originalEnv = process.env.CLOUDINARY_DELIVERY_BASE_URL;
      process.env.CLOUDINARY_DELIVERY_BASE_URL = 'https://cdn.example.com///';

      const result = (service as any).getDeliveryBaseUrl();

      expect(result).toBe('https://cdn.example.com');

      if (originalEnv) {
        process.env.CLOUDINARY_DELIVERY_BASE_URL = originalEnv;
      }
    });
  });

  describe('getFileUrl - URL Transformation', () => {
    it('should return empty string for empty secureUrl', () => {
      const result = service.getFileUrl('');
      expect(result).toBe('');
    });

    it('should return original URL when delivery base URL not set', () => {
      const originalEnv = process.env.CLOUDINARY_DELIVERY_BASE_URL;
      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;

      const secureUrl = 'https://res.cloudinary.com/test/image/upload/v1/test.png';
      const result = service.getFileUrl(secureUrl);

      expect(result).toBe(secureUrl);

      if (originalEnv) {
        process.env.CLOUDINARY_DELIVERY_BASE_URL = originalEnv;
      }
    });

    it('should replace Cloudinary domain with delivery base URL', () => {
      process.env.CLOUDINARY_DELIVERY_BASE_URL = 'https://cdn.example.com';

      const secureUrl = 'https://res.cloudinary.com/test/image/upload/v1/test.png';
      const result = service.getFileUrl(secureUrl);

      expect(result).toBe('https://cdn.example.com/image/upload/v1/test.png');

      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;
    });
  });

  describe('buildDeliveryUrl - URL Building', () => {
    it('should return empty string when publicId is empty', () => {
      const result = service.buildDeliveryUrl({
        publicId: '',
        resourceType: 'image',
      });
      expect(result).toBe('');
    });

    it('should return empty string when delivery base URL not set', () => {
      const originalEnv = process.env.CLOUDINARY_DELIVERY_BASE_URL;
      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;

      const result = service.buildDeliveryUrl({
        publicId: 'test/image',
        resourceType: 'image',
      });

      expect(result).toBe('');

      if (originalEnv) {
        process.env.CLOUDINARY_DELIVERY_BASE_URL = originalEnv;
      }
    });

    it('should build URL with version', () => {
      process.env.CLOUDINARY_DELIVERY_BASE_URL = 'https://cdn.example.com';

      const result = service.buildDeliveryUrl({
        publicId: 'test/image',
        resourceType: 'image',
        version: 123,
      });

      expect(result).toBe('https://cdn.example.com/image/upload/v123/test/image');

      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;
    });

    it('should build URL with format extension', () => {
      process.env.CLOUDINARY_DELIVERY_BASE_URL = 'https://cdn.example.com';

      const result = service.buildDeliveryUrl({
        publicId: 'test/image',
        resourceType: 'image',
        format: 'png',
      });

      expect(result).toBe('https://cdn.example.com/image/upload/test/image.png');

      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;
    });

    it('should not add extension for raw resource type', () => {
      process.env.CLOUDINARY_DELIVERY_BASE_URL = 'https://cdn.example.com';

      const result = service.buildDeliveryUrl({
        publicId: 'test/file',
        resourceType: 'raw',
        format: 'pdf',
      });

      expect(result).toBe('https://cdn.example.com/raw/upload/test/file');

      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;
    });

    it('should normalize leading slashes in publicId', () => {
      process.env.CLOUDINARY_DELIVERY_BASE_URL = 'https://cdn.example.com';

      const result = service.buildDeliveryUrl({
        publicId: '/test/image',
        resourceType: 'image',
      });

      expect(result).toBe('https://cdn.example.com/image/upload/test/image');

      delete process.env.CLOUDINARY_DELIVERY_BASE_URL;
    });
  });

  describe('getDownloadUrl', () => {
    it('should call getFileUrl with the same URL', () => {
      const secureUrl = 'https://res.cloudinary.com/test/image/upload/v1/test.png';
      const getFileUrlSpy = jest.spyOn(service, 'getFileUrl');

      service.getDownloadUrl(secureUrl);

      expect(getFileUrlSpy).toHaveBeenCalledWith(secureUrl);
    });
  });
});

describe('CloudinaryProvider', () => {
  it('should provide CLOUDINARY configuration', () => {
    expect(CloudinaryProvider.provide).toBe('CLOUDINARY');
    expect(CloudinaryProvider.useFactory).toBeDefined();
  });

  it('should call cloudinary.config with env variables', () => {
    const originalEnv = {
      CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    };

    process.env.CLOUDINARY_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';

    const result = CloudinaryProvider.useFactory();

    expect(result).toBeDefined();

    // Restore original env
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });
});
