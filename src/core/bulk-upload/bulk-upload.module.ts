import { Module } from '@nestjs/common';
import { BulkUploadService } from './bulk-upload.service';

@Module({
  providers: [BulkUploadService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}
