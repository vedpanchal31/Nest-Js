import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../core/guards/auth.guard';
import { ImageUpdateService } from './image-update.service';
import {
  UpdateImageDto,
  SingleImageUploadDto,
  EntityType,
} from './dtos/update-image.dto';
import { Request } from 'express';
import { ITokenPayload } from '../../core/constants/interfaces/common';

@ApiTags('Media')
@Controller('media/images')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ImageUpdateController {
  constructor(private readonly imageUpdateService: ImageUpdateService) {}

  @Post('update')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiOperation({ summary: 'Update images for product or category' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entityType', 'entityId'],
      properties: {
        entityType: {
          type: 'string',
          enum: ['product', 'category'],
          description: 'Type of entity',
        },
        entityId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of the entity',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'New images to upload',
        },
        deleteImageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of existing images to delete',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Images updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Entity not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async updateImages(
    @Req() req: Request & { user: ITokenPayload },
    @Body() updateImageDto: UpdateImageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Attach uploaded files to DTO
    if (files && files.length > 0) {
      updateImageDto.images = files;
    }

    return await this.imageUpdateService.updateImages(req.user, updateImageDto);
  }

  @Post('add')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Add a single image to product or category' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entityType', 'entityId', 'image'],
      properties: {
        entityType: {
          type: 'string',
          enum: ['product', 'category'],
          description: 'Type of entity',
        },
        entityId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of the entity',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Entity not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async addSingleImage(
    @Req() req: Request & { user: ITokenPayload },
    @Body() singleImageDto: SingleImageUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    return await this.imageUpdateService.addSingleImage(
      req.user,
      singleImageDto,
      file,
    );
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Delete images from product or category' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entityType', 'imageIds'],
      properties: {
        entityType: {
          type: 'string',
          enum: ['product', 'category'],
          description: 'Type of entity',
        },
        imageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of image IDs to delete',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Images deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async deleteImages(
    @Req() req: Request & { user: ITokenPayload },
    @Body()
    body: {
      entityType: EntityType;
      imageIds: string[];
    },
  ) {
    return await this.imageUpdateService.deleteImages(
      body.entityType,
      body.imageIds,
      req.user,
    );
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get all images for a product or category' })
  @ApiQuery({
    name: 'entityType',
    required: true,
    enum: ['product', 'category'],
    description: 'Type of entity',
  })
  @ApiResponse({
    status: 200,
    description: 'Images retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Entity not found',
  })
  async getEntityImages(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
    @Req() req: Request & { user?: ITokenPayload },
  ) {
    return await this.imageUpdateService.getEntityImages(
      entityType,
      entityId,
      req.user,
    );
  }

  @Delete(':entityType/:entityId/:imageId')
  @ApiOperation({ summary: 'Delete a single image' })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async deleteSingleImage(
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
    @Param('imageId') imageId: string,
    @Req() req: Request & { user: ITokenPayload },
  ) {
    return await this.imageUpdateService.deleteImages(
      entityType,
      [imageId],
      req.user,
    );
  }
}
