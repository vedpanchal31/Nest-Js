import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface OtpEmailData {
  subject: string;
  title: string;
  message: string;
  otp: string;
}

export interface PasswordResetEmailData {
  subject: string;
  title: string;
  message: string;
  otp: string;
  userName?: string;
}

export interface EmailBranding {
  year?: string;
  companyName?: string;
  tagline?: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
}

@Injectable()
export class EmailTemplateService {
  private readonly templatesDir: string;

  constructor() {
    // Use src folder path since templates aren't copied to dist during build
    this.templatesDir = path.join(process.cwd(), 'src', 'core', 'mailer', 'templates');
  }

  private loadTemplate(templateName: string): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    console.log('Loading template from:', templatePath);
    const content = fs.readFileSync(templatePath, 'utf-8');
    console.log('Template loaded, length:', content.length);
    return content;
  }

  private interpolateTemplate(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  getDefaultBranding(): EmailBranding {
    return {
      companyName: 'Velora',
      tagline: 'Premium E-Commerce Solutions',
      logoUrl: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/hugpvjg6op8enixjsrhk.png',
      address: '123 Business Avenue, New York, NY 10001',
      email: 'contact@velora.com',
      phone: '+1 (555) 123-4567',
      website: 'https://velora.com',
      year: new Date().getFullYear().toString(),
    };
  }

  renderOtpEmail(data: OtpEmailData & { userName?: string }): { html: string; subject: string } {
    const template = this.loadTemplate('otp-email');
    const branding = this.getDefaultBranding();

    // Split OTP into individual digits
    const otpDigits = data.otp.split('');
    const otpData: Record<string, string> = {};
    otpDigits.forEach((digit, index) => {
      otpData[`otp${index + 1}`] = digit;
    });

    const mergedData = {
      ...branding,
      ...data,
      userName: data.userName || 'there',
      ...otpData,
    };

    const html = this.interpolateTemplate(template, mergedData as Record<string, string>);

    return {
      html,
      subject: data.subject,
    };
  }

  renderPasswordResetEmail(data: PasswordResetEmailData): { html: string; subject: string } {
    const template = this.loadTemplate('password-reset-email');
    const branding = this.getDefaultBranding();

    // Split OTP into individual digits
    const otpDigits = data.otp.split('');
    const otpData: Record<string, string> = {};
    otpDigits.forEach((digit, index) => {
      otpData[`otp${index + 1}`] = digit;
    });

    const mergedData = {
      ...branding,
      ...data,
      userName: data.userName || 'there',
      ...otpData,
    };

    const html = this.interpolateTemplate(template, mergedData as Record<string, string>);

    return {
      html,
      subject: data.subject,
    };
  }
}
