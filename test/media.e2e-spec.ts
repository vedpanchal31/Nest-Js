/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MediaController } from '../src/domain/media/media.controller';
import { MediaService } from '../src/domain/media/media.service';

describe('MediaController (e2e)', () => {
  let app: INestApplication<App>;

  const mockMedia = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    path: 'public/media/images/1234567890-test.png',
    url: 'https://cloudinary.com/media/images/1234567890-test.png',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe('POST /media/upload', () => {
    it('should upload files successfully (public)', async () => {
      const response = await request(app.getHttpServer())
        .post('/media/upload')
        .attach('files', Buffer.from('test-image'), 'test.png')
        .expect(201);

      expect(response.body.message).toBe('Files uploaded successfully');
      expect(response.body.count).toBe(1);
    });

    it('should return 400 when no files uploaded', async () => {
      mockMediaService.uploadFilesPublic.mockRejectedValue(new Error('At least one file must be provided'));

      await request(app.getHttpServer())
        .post('/media/upload')
        .expect(400);
    });

    it('should handle pathKey parameter', async () => {
      // The pathKey field is passed but validation may fail if pathId is required
      mockMediaService.uploadFilesPublic.mockRejectedValue(new BadRequestException('pathId is required'));

      await request(app.getHttpServer())
        .post('/media/upload')
        .field('pathKey', 'MEDIA_IMAGE')
        .attach('files', Buffer.from('test-image'), 'test.png')
        .expect(400);
    });
  });

  describe('GET /media', () => {
    it('should return paginated media list (public)', async () => {
      const response = await request(app.getHttpServer())
        .get('/media?page=1&limit=20')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
    });

    it('should apply search filter', async () => {
      await request(app.getHttpServer())
        .get('/media?page=1&limit=20&search=test')
        .expect(200);

      expect(mockMediaService.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' }),
      );
    });

    it('should use default pagination', async () => {
      await request(app.getHttpServer())
        .get('/media')
        .expect(200);

      expect(mockMediaService.findAllPublic).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });

  describe('GET /media/:id', () => {
    it('should return media by id (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/media/${mockMedia.id}`)
        .expect(200);

      expect(response.body).toEqual(mockMedia);
    });

    it('should return 400 for invalid id format', async () => {
      await request(app.getHttpServer())
        .get('/media/invalid-uuid')
        .expect(400);
    });
  });

  describe('GET /media/stats', () => {
    it('should return media statistics (public)', async () => {
      const response = await request(app.getHttpServer())
        .get('/media/stats')
        .expect(200);

      expect(response.body.totalFiles).toBe(1);
    });
  });

  describe('GET /media/:id/download', () => {
    it('should return download URL (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/media/${mockMedia.id}/download`)
        .expect(200);

      expect(response.body.downloadUrl).toBeDefined();
    });

    it('should return 400 for invalid id format', async () => {
      await request(app.getHttpServer())
        .get('/media/invalid-uuid/download')
        .expect(400);
    });
  });

  describe('PATCH /media/:id', () => {
    it('should update media (public)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/media/${mockMedia.id}`)
        .send({})
        .expect(200);

      expect(response.body).toEqual(mockMedia);
    });

    it('should return 400 for invalid id format', async () => {
      await request(app.getHttpServer())
        .patch('/media/invalid-uuid')
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /media/:id', () => {
    it('should delete media (public)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/media/${mockMedia.id}`)
        .expect(200);

      expect(response.body.message).toBe('Media file deleted successfully');
    });

    it('should return 400 for invalid id format', async () => {
      await request(app.getHttpServer())
        .delete('/media/invalid-uuid')
        .expect(400);
    });
  });
});
