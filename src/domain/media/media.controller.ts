import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import {
  UploadMediaDto,
  UpdateMediaDto,
  MediaResponseDto,
  MediaListQueryDto,
} from './dtos/media.dto';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload multiple files (Public)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          maxItems: 10,
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    type: [MediaResponseDto],
  })
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto?: UploadMediaDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }

    const uploadedMedia = await this.mediaService.uploadFilesPublic(
      files,
      uploadDto,
    );

    return {
      message: 'Files uploaded successfully',
      data: uploadedMedia,
      count: uploadedMedia.length,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all media files (Public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Media files retrieved successfully',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/MediaResponseDto' },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(@Query() query: MediaListQueryDto) {
    return this.mediaService.findAllPublic(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get media statistics (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Media statistics retrieved successfully',
    schema: {
      properties: {
        totalFiles: { type: 'number' },
      },
    },
  })
  async getStats() {
    return this.mediaService.getStatsPublic();
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get media delivery URL (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      properties: {
        downloadUrl: { type: 'string', example: 'https://res.cloudinary.com/...' },
      },
    },
  })
  async getDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    const downloadUrl = await this.mediaService.getDownloadUrl(id);
    return {
      downloadUrl,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media file by ID (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Media file retrieved successfully',
    type: MediaResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findOnePublic(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update media file metadata (Public)' })
  @ApiBody({ type: UpdateMediaDto })
  @ApiResponse({
    status: 200,
    description: 'Media file updated successfully',
    type: MediaResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMediaDto,
  ) {
    return this.mediaService.updatePublic(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media file (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Media file deleted successfully',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.mediaService.removePublic(id);
    return {
      message: 'Media file deleted successfully',
    };
  }
}
