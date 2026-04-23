import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/orders/entities/order.entity';
import { OrderStatus, PaymentMethod } from '../constants/app.constants';
import * as puppeteer from 'puppeteer';
import { SettingsService } from '../../domain/settings/settings.service';
import * as QRCode from 'qrcode';

interface CompanyInfo {
  name?: string | null;
  tagline?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}

@Injectable()
export class InvoiceService {
  constructor(private readonly settingsService: SettingsService) {}

  async generateInvoice(order: Order): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Get company info and logo from settings
      const [companyLogo, companyInfo] = await Promise.all([
        this.settingsService.getCompanyLogo(),
        this.settingsService.getCompanyInfo(),
      ]);

      // Generate QR code linking to PUBLIC order details page (no auth required)
      const baseUrl = process.env.APP_URL;
      const orderDetailsUrl = `${baseUrl}/orders/public/${order.id}`;
      const qrCodeDataUrl = (await QRCode.toDataURL(orderDetailsUrl, {
        width: 120,
        margin: 2,
        color: {
          dark: '#232f3e',
          light: '#ffffff',
        },
      })) as string;

      const htmlContent = this.generateInvoiceHTML(
        order,
        companyLogo.logoUrl,
        companyInfo,
        qrCodeDataUrl,
      );

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private generateInvoiceHTML(
    order: Order,
    logoUrl: string,
    companyInfo: CompanyInfo,
    qrCodeDataUrl: string,
  ): string {
    // Calculate due date (30 days from order date)
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const invoiceDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const orderStatus = this.getOrderStatusText(order.status);
    const paymentMethod = this.getPaymentMethodText(order.paymentMethod);
    const invoiceNumber = `VL-${order.id.substring(0, 8).toUpperCase()}`;

    // Logo configuration
    const logoConfig = {
      maxHeight: '120px',
      maxWidth: '400px',
      fallbackText: 'Velora',
    };

    // Build invoice sections
    const headerSection = this.buildAmazonHeader(
      logoUrl,
      logoConfig,
      companyInfo,
    );
    const orderInfoBar = this.buildOrderInfoBar(
      order,
      invoiceNumber,
      invoiceDate,
      dueDateStr,
      paymentMethod,
      orderStatus,
    );
    const addressSection = this.buildAddressSection(order, companyInfo);
    const itemsTable = this.buildItemsTable(order);
    const orderSummary = this.buildOrderSummary(order);
    const qrCodeSection = this.buildQRCodeSection(qrCodeDataUrl, order.id);
    const notesSection = this.buildNotesSection(companyInfo);
    const footerSection = this.buildAmazonFooter(companyInfo);
    const statusStamp = this.buildStatusStamp(order.status);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: #fff;
          }
          
          /* Order Status Stamp */
          .status-stamp {
            position: absolute;
            top: 195px;
            right: 60px;
            width: 85px;
            height: 85px;
            border: 3px solid;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(-20deg);
            opacity: 0.85;
            z-index: 100;
          }
          
          .stamp-text {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
          }
          
          .status-stamp.paid {
            border-color: #2ecc71;
            color: #2ecc71;
            background: rgba(46, 204, 113, 0.1);
          }
          
          .status-stamp.pending {
            border-color: #f39c12;
            color: #f39c12;
            background: rgba(243, 156, 18, 0.1);
          }
          .status-stamp.confirmed {
            border-color: #f39c12;
            color: #f39c12;
            background: rgba(243, 156, 18, 0.1);
          }
          .status-stamp.cancelled {
            border-color: #e74c3c;
            color: #e74c3c;
            background: rgba(231, 76, 60, 0.1);
          }
          
          .status-stamp.delivered {
            border-color: #3498db;
            color: #3498db;
            background: rgba(52, 152, 219, 0.1);
          }

           .status-stamp.shipped {
            border-color: #3498db;
            color: #3498db;
            background: rgba(52, 152, 219, 0.1);
          }
          
          .stamp-text {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
          }
          
          .invoice-wrapper {
            position: relative;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
          }
          
          /* Top Header Bar */
          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            border-bottom: 2px solid #232f3e;
            margin-bottom: 20px;
          }
          
          .logo-section img {
            max-height: 100px;
            max-width: 350px;
          }
          
          .invoice-type {
            font-size: 18px;
            font-weight: bold;
            color: #232f3e;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          /* Order Info Bar */
          .order-info-bar {
            background: #f3f3f3;
            padding: 15px 20px;
            margin-bottom: 25px;
            border-radius: 4px;
          }
          
          .order-info-row {
            display: flex;
            gap: 40px;
            flex-wrap: wrap;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
          }
          
          .info-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 3px;
          }
          
          .info-value {
            font-size: 13px;
            font-weight: 600;
            color: #232f3e;
          }
          
          /* Address Section */
          .address-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding: 20px;
            background: #fafafa;
            border-radius: 4px;
          }
          
          .address-box h4 {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
          }
          
          .address-box p {
            font-size: 12px;
            color: #333;
            line-height: 1.6;
            margin: 2px 0;
          }
          
          .address-box strong {
            font-weight: 600;
            color: #000;
          }
          
          .seller-gst {
            font-size: 10px;
            color: #666;
            margin-top: 8px;
          }
          
          /* Items Section */
          .items-section {
            margin-bottom: 25px;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #232f3e;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #232f3e;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          
          .items-table thead {
            background: #232f3e;
          }
          
          .items-table th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            color: #fff;
            font-size: 11px;
            text-transform: uppercase;
          }
          
          .items-table th:last-child,
          .items-table th:nth-child(4) {
            text-align: right;
          }
          
          .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #e0e0e0;
            vertical-align: top;
          }
          
          .items-table td:last-child,
          .items-table td:nth-child(4) {
            text-align: right;
          }
          
          .items-table tr:hover {
            background: #f9f9f9;
          }
          
          .product-info {
            display: flex;
            flex-direction: column;
          }
          
          .product-name {
            font-weight: 600;
            color: #0066c0;
            margin-bottom: 3px;
          }
          
          .product-sku {
            font-size: 10px;
            color: #888;
          }
          
          .qty-badge {
            background: #f0f0f0;
            padding: 2px 8px;
            border-radius: 3px;
            font-weight: 600;
          }
          
          /* Order Summary */
          .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 25px;
          }
          
          .summary-table {
            width: 350px;
            border-collapse: collapse;
          }
          
          .summary-table td {
            padding: 8px 0;
            font-size: 13px;
          }
          
          .summary-table td:first-child {
            text-align: left;
            color: #666;
          }
          
          .summary-table td:last-child {
            text-align: right;
            font-weight: 500;
            color: #333;
          }
          
          .summary-table .grand-total {
            font-size: 16px;
            font-weight: 700;
            color: #b12704;
            border-top: 2px solid #232f3e;
            padding-top: 10px;
          }
          
          .summary-table .grand-total td {
            padding-top: 12px;
          }
          
          /* Notes Section */
          .notes-section {
            background: #fff8e7;
            border: 1px solid #ffe4b5;
            border-radius: 4px;
            padding: 15px 20px;
            margin-bottom: 25px;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-before: auto;
            break-before: auto;
          }
          
          .notes-section h4 {
            font-size: 12px;
            font-weight: 700;
            color: #8b6914;
            margin-bottom: 8px;
          }
          
          .notes-section p {
            font-size: 12px;
            color: #666;
            line-height: 1.6;
          }
          
          /* Footer */
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
          }
          
          .footer-company {
            font-size: 14px;
            font-weight: 700;
            color: #232f3e;
            margin-bottom: 8px;
          }
          
          .footer-address {
            font-size: 11px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 15px;
          }
          
          .footer-note {
            font-size: 10px;
            color: #999;
            font-style: italic;
          }
          
          .thank-you-msg {
            font-size: 16px;
            font-weight: 600;
            color: #232f3e;
            margin: 20px 0 10px;
          }
          
          /* QR Code Section */
          .qr-section {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 15px;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px dashed #ddd;
          }
          
          .qr-code {
            width: 100px;
            height: 100px;
          }
          
          .qr-code img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          
          .qr-info {
            text-align: right;
          }
          
          .qr-info p {
            font-size: 11px;
            color: #666;
            margin: 0;
          }
          
          .qr-info strong {
            font-size: 12px;
            color: #232f3e;
            display: block;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          ${statusStamp}
          ${headerSection}
          ${orderInfoBar}
          ${addressSection}
          ${itemsTable}
          ${orderSummary}
          ${qrCodeSection}
          ${notesSection}
          ${footerSection}
        </div>
      </body>
      </html>
    `;
  }

  // New Amazon-style section builders
  private buildAmazonHeader(
    logoUrl: string,
    logoConfig: any,
    companyInfo: CompanyInfo,
  ): string {
    const companyName = companyInfo?.name || 'Velora';
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${companyName}" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\'logo-text\\'>${companyName}</span>';" />`
      : `<span class="logo-text">${companyName}</span>`;

    return `
      <div class="top-bar">
        <div class="logo-section">
          ${logoHtml}
        </div>
        <div class="invoice-type">Invoice</div>
      </div>
    `;
  }

  private buildOrderInfoBar(
    order: Order,
    invoiceNumber: string,
    invoiceDate: string,
    dueDate: string,
    paymentMethod: string,
    orderStatus: string,
  ): string {
    return `
      <div class="order-info-bar">
        <div class="order-info-row">
          <div class="info-item">
            <span class="info-label">Order ID</span>
            <span class="info-value">#${order.id.substring(0, 14).toUpperCase()}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Invoice Number</span>
            <span class="info-value">${invoiceNumber}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Invoice Date</span>
            <span class="info-value">${invoiceDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Due Date</span>
            <span class="info-value">${dueDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Payment Method</span>
            <span class="info-value">${paymentMethod}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="info-value" style="color: ${orderStatus === 'Paid' ? '#2ecc71' : orderStatus === 'Pending' ? '#f39c12' : '#e74c3c'};">${orderStatus}</span>
          </div>
        </div>
      </div>
    `;
  }

  private buildAddressSection(order: Order, companyInfo: CompanyInfo): string {
    const sellerName = companyInfo?.name || 'Velora Inc.';
    const sellerAddress =
      companyInfo?.address ||
      '123 Business Avenue, Suite 100, New York, NY 10001';
    const sellerEmail = companyInfo?.email || 'contact@velora.com';
    const sellerPhone = companyInfo?.phone || '+1 (555) 123-4567';

    return `
      <div class="address-section">
        <div class="address-box">
          <h4>Sold By</h4>
          <p><strong>${sellerName}</strong></p>
          <p>${sellerAddress}</p>
          <p>Email: ${sellerEmail}</p>
          <p>Phone: ${sellerPhone}</p>
          <p style="margin-top: 8px;">GSTIN: 27AABCU9603R1ZX</p>
        </div>
        <div class="address-box">
          <h4>Billing Address</h4>
          <p><strong>${order.user?.name || 'Customer'}</strong></p>
          <p>${order.user?.email || 'N/A'}</p>
          <p>${order.addressLine1}</p>
          ${order.addressLine2 ? `<p>${order.addressLine2}</p>` : ''}
          <p>${order.city}, ${order.state} - ${order.region}</p>
          <p>${order.country}</p>
        </div>
        <div class="address-box">
          <h4>Shipping Address</h4>
          <p><strong>${order.user?.name || 'Customer'}</strong></p>
          <p>${order.addressLine1}</p>
          ${order.addressLine2 ? `<p>${order.addressLine2}</p>` : ''}
          <p>${order.city}, ${order.state} - ${order.region}</p>
          <p>${order.country}</p>
          <p style="margin-top: 8px; color: #0066c0; font-weight: 600;">Status: ${this.getOrderStatusText(order.status)}</p>
        </div>
      </div>
    `;
  }

  private buildItemsTable(order: Order): string {
    const itemsRows = order.items
      .map((item) => {
        if (!item.product) return '';
        const unitPrice = Number(item.price);
        const quantity = item.quantity;
        const total = unitPrice * quantity;

        return `
        <tr>
          <td>
            <div class="product-info">
              <span class="product-name">${item.product.name || 'Product'}</span>
              <span class="product-sku">SKU: ${item.product.id?.substring(0, 12).toUpperCase() || 'N/A'}</span>
            </div>
          </td>
          <td style="text-align: center;"><span class="qty-badge">${quantity}</span></td>
          <td style="text-align: right;">$${unitPrice.toFixed(2)}</td>
          <td style="text-align: right; font-weight: 600;">$${total.toFixed(2)}</td>
        </tr>
      `;
      })
      .join('');

    return `
      <div class="items-section">
        <div class="section-title">Order Items</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50%;">Product Details</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 17.5%;">Price</th>
              <th style="width: 17.5%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>
    `;
  }

  private buildOrderSummary(order: Order): string {
    const subtotal = Number(order.totalAmount) - Number(order.tax);
    const tax = Number(order.tax);
    const total = Number(order.totalAmount);

    return `
      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td>Subtotal:</td>
            <td>$${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Shipping:</td>
            <td style="color: #2ecc71;">FREE</td>
          </tr>
          <tr>
            <td>Tax (GST):</td>
            <td>$${tax.toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total:</td>
            <td>$${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    `;
  }

  private buildNotesSection(companyInfo: CompanyInfo): string {
    const supportEmail = companyInfo?.email || 'support@velora.com';
    const supportPhone = companyInfo?.phone || '+1 (555) 123-4567';

    return `
      <div class="notes-section">
        <h4>Important Notes</h4>
        <p>This is a computer-generated invoice and does not require a physical signature. For any queries regarding this invoice, please contact our customer support at ${supportEmail} or call ${supportPhone}.</p>
        <p style="margin-top: 8px;"><strong>Return Policy:</strong> Items can be returned within 30 days of delivery. Please keep the invoice for warranty and return purposes.</p>
      </div>
    `;
  }

  private buildAmazonFooter(companyInfo: CompanyInfo): string {
    const companyName = companyInfo?.name || 'Velora Inc.';
    const address =
      companyInfo?.address ||
      '123 Business Avenue, Suite 100, New York, NY 10001, United States';
    const email = companyInfo?.email || 'support@velora.com';
    const phone = companyInfo?.phone || '+1 (555) 123-4567';
    const website = companyInfo?.website || 'www.velora.com';

    return `
      <div class="footer">
        <div class="footer-company">${companyName}</div>
        <div class="footer-address">
          ${address}<br>
          Email: ${email} | Phone: ${phone} | Website: ${website}
        </div>
        <div class="thank-you-msg">Thank you for shopping with ${companyName}!</div>
        <div class="footer-note">
          Invoice generated on ${new Date().toLocaleString('en-US')} | All prices in USD
        </div>
      </div>
    `;
  }

  private getOrderStatusText(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Pending';
      case OrderStatus.CONFIRMED:
        return 'Confirmed';
      case OrderStatus.SHIPPED:
        return 'Shipped';
      case OrderStatus.DELIVERED:
        return 'Delivered';
      case OrderStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  private getPaymentMethodText(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH_ON_DELIVERY:
        return 'Cash on Delivery';
      case PaymentMethod.ONLINE:
        return 'Online Payment';
      default:
        return 'Unknown';
    }
  }

  private buildQRCodeSection(qrCodeDataUrl: string, orderId: string): string {
    return `
      <div class="qr-section">
        <div class="qr-info">
          <strong>Scan to View Order</strong>
          <p>Order ID: #${orderId.substring(0, 14).toUpperCase()}</p>
          <p>Scan this QR code to view order details online</p>
        </div>
        <div class="qr-code">
          <img src="${qrCodeDataUrl}" alt="Order QR Code" />
        </div>
      </div>
    `;
  }

  private buildStatusStamp(status: OrderStatus): string {
    let stampClass = '';
    let stampText = '';

    switch (status) {
      case OrderStatus.PENDING:
        stampClass = 'pending';
        stampText = 'PENDING';
        break;
      case OrderStatus.CONFIRMED:
        stampClass = 'paid';
        stampText = 'CONFIRMED';
        break;
      case OrderStatus.SHIPPED:
        stampClass = 'paid';
        stampText = 'SHIPPED';
        break;
      case OrderStatus.DELIVERED:
        stampClass = 'delivered';
        stampText = 'DELIVERED';
        break;
      case OrderStatus.CANCELLED:
        stampClass = 'cancelled';
        stampText = 'CANCELLED';
        break;
      default:
        stampClass = 'pending';
        stampText = 'PENDING';
    }

    return `
      <div class="status-stamp ${stampClass}">
        <span class="stamp-text">${stampText}</span>
      </div>
    `;
  }
}
