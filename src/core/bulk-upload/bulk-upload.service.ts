import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import AdmZip from 'adm-zip';
import { Response } from 'express';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  dropdown?: string[];
  required?: boolean;
}

export interface BulkUploadResult<T> {
  success: boolean;
  message: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    value: unknown;
    message: string;
  }>;
  data?: T[];
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
}

@Injectable()
export class BulkUploadService {
  private getCellText(value: ExcelJS.CellValue | undefined): string {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value).trim();
    }

    return '';
  }

  /**
   * Generate a sample Excel file with optional dropdowns
   */
  async generateSampleExcel(
    columns: ExcelColumn[],
    sampleData: Record<string, unknown>[],
    filename: string,
    sheetName: string,
    res: Response,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Define columns
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    // Insert instructions row above headers (row 1)
    const instructionsRow = worksheet.insertRow(1, []);
    columns.forEach((col, index) => {
      let instruction = '';
      if (col.required) {
        instruction = 'Required. ';
      }
      if (col.dropdown && col.dropdown.length > 0) {
        instruction += 'Select from dropdown.';
      } else if (col.key === 'image' || col.key === 'images') {
        instruction +=
          'Enter filename (e.g., image.jpg). Must match file in ZIP.';
      } else if (col.key === 'price') {
        instruction += 'Enter numeric value (e.g., 29.99).';
      } else if (col.key === 'category') {
        instruction += 'Select category name from dropdown.';
      } else if (col.key === 'supplier') {
        instruction += 'Select supplier email from dropdown (Admin only).';
      } else {
        instruction += 'Enter text value.';
      }

      const cell = instructionsRow.getCell(index + 1);
      cell.value = instruction;
      cell.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF4E6' },
      };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });

    // Style header row (now row 2)
    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      cell.border = {
        bottom: { style: 'thin' },
      };
    });

    // Add dropdown validations
    columns.forEach((col, index) => {
      if (col.dropdown && col.dropdown.length > 0) {
        // Create a hidden sheet for dropdown values
        let dropdownSheet = workbook.getWorksheet('Dropdowns');
        if (!dropdownSheet) {
          dropdownSheet = workbook.addWorksheet('Dropdowns');
          dropdownSheet.state = 'hidden';
        }

        const dropdownColumn = String.fromCharCode(65 + index); // A, B, C...
        const startRow = dropdownSheet.rowCount + 1;

        // Add dropdown values
        col.dropdown.forEach((value, idx) => {
          dropdownSheet.getCell(`${dropdownColumn}${startRow + idx}`).value =
            value;
        });

        // Apply data validation to the main column (data starts from row 3)
        const lastRow = 1002; // Allow up to 1000 data rows
        (
          worksheet as unknown as {
            dataValidations: {
              add: (range: string, validation: ExcelJS.DataValidation) => void;
            };
          }
        ).dataValidations.add(
          `${dropdownColumn}3:${dropdownColumn}${lastRow}`,
          {
            type: 'list',
            allowBlank: true,
            formulae: [
              `Dropdowns!$${dropdownColumn}$${startRow}:$${dropdownColumn}$${startRow + col.dropdown.length - 1}`,
            ],
            showErrorMessage: true,
            errorTitle: 'Invalid Value',
            error: 'Please select from the dropdown list',
          },
        );
      }
    });

    // Add sample data (starts from row 3)
    if (sampleData && sampleData.length > 0) {
      sampleData.forEach((row) => {
        worksheet.addRow(row);
      });
    }

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Parse Excel file and return rows
   */
  async parseExcelFile(
    excelBuffer: Buffer,
    expectedColumns: string[],
  ): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Excel file is empty or invalid');
    }

    const rows: ParsedRow[] = [];

    // Get headers from row 2 (row 1 is instructions)
    const headers: string[] = [];
    worksheet.getRow(2).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = this.getCellText(cell.value);
    });

    // Validate headers
    const missingColumns = expectedColumns.filter(
      (col) => !headers.includes(col),
    );
    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${missingColumns.join(', ')}`,
      );
    }

    // Parse data rows (skip row 1-instructions, row 2-headers, start from row 3)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // Skip instructions and header rows

      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          // Handle different cell types
          let value: unknown = cell.value;

          if (cell.value && typeof cell.value === 'object') {
            // Handle rich text or formula results
            if ('richText' in cell.value) {
              value = cell.value.richText.map((t) => t.text).join('');
            } else if ('result' in cell.value) {
              value = (cell.value as ExcelJS.CellFormulaValue).result;
            }
          }

          rowData[header] = value;
        }
      });

      // Only add row if it has at least one non-empty value
      if (Object.values(rowData).some((v) => v !== undefined && v !== '')) {
        rows.push({
          rowNumber,
          data: rowData,
        });
      }
    });

    return rows;
  }

  /**
   * Extract images from ZIP file
   */
  extractImagesFromZip(zipBuffer: Buffer): Map<string, Buffer> {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    const images = new Map<string, Buffer>();

    console.log(`ZIP contains ${entries.length} entries`);

    entries.forEach((entry) => {
      console.log(`Entry: "${entry.name}", isDirectory: ${entry.isDirectory}`);
      if (!entry.isDirectory) {
        const ext = entry.name.toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
          // Store with just the filename (no path)
          const filename = entry.name.split('/').pop() || entry.name;
          console.log(`Extracted image: "${filename}"`);
          images.set(filename, entry.getData());
        }
      }
    });

    console.log(`Total images extracted: ${images.size}`);
    return images;
  }

  /**
   * Validate required fields in a row
   */
  validateRequiredFields(
    row: ParsedRow,
    requiredFields: string[],
  ): Array<{ row: number; field: string; value: unknown; message: string }> {
    const errors: Array<{
      row: number;
      field: string;
      value: unknown;
      message: string;
    }> = [];

    for (const field of requiredFields) {
      const value = row.data[field];
      if (value === undefined || value === '' || value === null) {
        errors.push({
          row: row.rowNumber,
          field,
          value,
          message: `${field} is required`,
        });
      }
    }

    return errors;
  }

  /**
   * Match image filenames from Excel with ZIP contents
   */
  matchImages(
    imageFilenames: string[],
    zipImages: Map<string, Buffer>,
  ): {
    matched: Map<string, Buffer>;
    unmatched: string[];
  } {
    const matched = new Map<string, Buffer>();
    const unmatched: string[] = [];

    console.log('Available ZIP images:', Array.from(zipImages.keys()));
    console.log('Looking for images:', imageFilenames);

    imageFilenames.forEach((filename) => {
      const normalizedName = filename.trim();
      if (zipImages.has(normalizedName)) {
        matched.set(normalizedName, zipImages.get(normalizedName)!);
      } else {
        unmatched.push(normalizedName);
        console.log(`Image not found: "${normalizedName}"`);
      }
    });

    console.log('Matched:', Array.from(matched.keys()));
    console.log('Unmatched:', unmatched);

    return { matched, unmatched };
  }
}
