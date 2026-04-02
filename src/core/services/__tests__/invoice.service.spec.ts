import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from '../invoice.service';
import { SettingsService } from '../../../domain/settings/settings.service';
import { Order } from '../../../domain/orders/entities/order.entity';
import { OrderStatus, PaymentMethod } from '../../constants/app.constants';
import * as puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('InvoiceService - Comprehensive', () => {
  let service: InvoiceService;
  let settingsService: jest.Mocked<SettingsService>;
  let mockBrowser: any;
  let mockPage: any;

  const mockOrder = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    status: OrderStatus.CONFIRMED,
    paymentMethod: PaymentMethod.ONLINE,
    totalAmount: 199.99,
    tax: 19.99,
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    region: 'Manhattan',
    country: 'USA',
    createdAt: new Date('2024-01-15'),
    user: {
      id: 'user-uuid',
      name: 'John Doe',
      email: 'john@example.com',
    },
    items: [
      {
        id: 'item-uuid',
        quantity: 2,
        price: 89.99,
        product: {
          id: 'product-uuid',
          name: 'Test Product',
        },
      },
    ],
  } as unknown as Order;

  const mockSettingsService = {
    getCompanyLogo: jest.fn().mockResolvedValue({
      logoUrl: 'https://example.com/logo.png',
    }),
    getCompanyInfo: jest.fn().mockResolvedValue({
      name: 'Velora Inc.',
      address: '123 Business Ave, New York, NY 10001',
      email: 'support@velora.com',
      phone: '+1 (555) 123-4567',
      website: 'www.velora.com',
    }),
  };

  beforeEach(async () => {
    // Setup puppeteer mocks
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    };
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qrcode123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    settingsService = module.get(SettingsService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInvoice - PDF Generation', () => {
    it('should generate invoice PDF successfully', async () => {
      const result = await service.generateInvoice(mockOrder);

      expect(result).toBeInstanceOf(Buffer);
      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should call settings service for company info', async () => {
      await service.generateInvoice(mockOrder);

      expect(settingsService.getCompanyLogo).toHaveBeenCalled();
      expect(settingsService.getCompanyInfo).toHaveBeenCalled();
    });

    it('should generate QR code with order URL', async () => {
      process.env.APP_URL = 'https://app.example.com';

      await service.generateInvoice(mockOrder);

      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        `https://app.example.com/orders/public/${mockOrder.id}`,
        expect.objectContaining({
          width: 120,
          margin: 2,
        }),
      );

      delete process.env.APP_URL;
    });

    it('should close browser even on error', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      await expect(service.generateInvoice(mockOrder)).rejects.toThrow('PDF generation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle order with multiple items', async () => {
      const orderWithMultipleItems = {
        ...mockOrder,
        items: [
          {
            id: 'item-1',
            quantity: 1,
            price: 50,
            product: { id: 'prod-1', name: 'Product 1' },
          },
          {
            id: 'item-2',
            quantity: 3,
            price: 25,
            product: { id: 'prod-2', name: 'Product 2' },
          },
        ],
      } as unknown as Order;

      const result = await service.generateInvoice(orderWithMultipleItems);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockPage.setContent).toHaveBeenCalled();
    });

    it('should handle order without addressLine2', async () => {
      const orderWithoutAddress2 = {
        ...mockOrder,
        addressLine2: null,
      } as unknown as Order;

      const result = await service.generateInvoice(orderWithoutAddress2);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generateInvoiceHTML - Invoice HTML Generation', () => {
    it('should generate complete invoice HTML', () => {
      const companyLogo = { logoUrl: 'https://example.com/logo.png' };
      const companyInfo = {
        name: 'Velora Inc.',
        address: '123 Business Ave',
        email: 'support@velora.com',
        phone: '+1 (555) 123-4567',
      };
      const qrCodeDataUrl = 'data:image/png;base64,test';

      const result = (service as any).generateInvoiceHTML(mockOrder, companyLogo.logoUrl, companyInfo, qrCodeDataUrl);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Invoice');
      expect(result).toContain(mockOrder.id.substring(0, 8).toUpperCase());
      expect(result).toContain('Velora Inc.');
      expect(result).toContain('data:image/png;base64,test');
    });

    it('should include status stamp in HTML', () => {
      const companyLogo = { logoUrl: '' };
      const companyInfo = { name: 'Velora' };
      const qrCodeDataUrl = 'data:image/png;base64,test';

      const result = (service as any).generateInvoiceHTML(mockOrder, companyLogo, companyInfo, qrCodeDataUrl);

      expect(result).toContain('status-stamp');
    });
  });

  describe('getOrderStatusText - Status Conversion', () => {
    it('should return Pending for PENDING status', () => {
      const result = (service as any).getOrderStatusText(OrderStatus.PENDING);
      expect(result).toBe('Pending');
    });

    it('should return Confirmed for CONFIRMED status', () => {
      const result = (service as any).getOrderStatusText(OrderStatus.CONFIRMED);
      expect(result).toBe('Confirmed');
    });

    it('should return Shipped for SHIPPED status', () => {
      const result = (service as any).getOrderStatusText(OrderStatus.SHIPPED);
      expect(result).toBe('Shipped');
    });

    it('should return Delivered for DELIVERED status', () => {
      const result = (service as any).getOrderStatusText(OrderStatus.DELIVERED);
      expect(result).toBe('Delivered');
    });

    it('should return Cancelled for CANCELLED status', () => {
      const result = (service as any).getOrderStatusText(OrderStatus.CANCELLED);
      expect(result).toBe('Cancelled');
    });

    it('should return Unknown for invalid status', () => {
      const result = (service as any).getOrderStatusText(999 as OrderStatus);
      expect(result).toBe('Unknown');
    });
  });

  describe('getPaymentMethodText - Payment Method Conversion', () => {
    it('should return Cash on Delivery for CASH_ON_DELIVERY', () => {
      const result = (service as any).getPaymentMethodText(PaymentMethod.CASH_ON_DELIVERY);
      expect(result).toBe('Cash on Delivery');
    });

    it('should return Online Payment for ONLINE', () => {
      const result = (service as any).getPaymentMethodText(PaymentMethod.ONLINE);
      expect(result).toBe('Online Payment');
    });

    it('should return Unknown for invalid method', () => {
      const result = (service as any).getPaymentMethodText(999 as PaymentMethod);
      expect(result).toBe('Unknown');
    });
  });

  describe('buildStatusStamp - Status Stamp HTML', () => {
    it('should build pending stamp for PENDING status', () => {
      const result = (service as any).buildStatusStamp(OrderStatus.PENDING);
      expect(result).toContain('pending');
      expect(result).toContain('PENDING');
    });

    it('should build paid stamp for CONFIRMED status', () => {
      const result = (service as any).buildStatusStamp(OrderStatus.CONFIRMED);
      expect(result).toContain('paid');
      expect(result).toContain('CONFIRMED');
    });

    it('should build cancelled stamp for CANCELLED status', () => {
      const result = (service as any).buildStatusStamp(OrderStatus.CANCELLED);
      expect(result).toContain('cancelled');
      expect(result).toContain('CANCELLED');
    });

    it('should build delivered stamp for DELIVERED status', () => {
      const result = (service as any).buildStatusStamp(OrderStatus.DELIVERED);
      expect(result).toContain('delivered');
      expect(result).toContain('DELIVERED');
    });

    it('should build pending stamp for unknown status (default case)', () => {
      const result = (service as any).buildStatusStamp(999 as OrderStatus);
      expect(result).toContain('pending');
      expect(result).toContain('PENDING');
    });

    describe('buildOrderSummary - Summary HTML', () => {
      it('should calculate subtotal correctly', () => {
        const order = { ...mockOrder, totalAmount: 110, tax: 10 };
        const result = (service as any).buildOrderSummary(order);

        expect(result).toContain('Subtotal:');
        expect(result).toContain('$100.00');
        expect(result).toContain('$10.00'); // Tax
        expect(result).toContain('$110.00'); // Total
      });
    });

    describe('buildItemsTable - Items HTML', () => {
      it('should build items table with product details', () => {
        const result = (service as any).buildItemsTable(mockOrder);

        expect(result).toContain('Test Product');
        expect(result).toContain('2'); // quantity
        expect(result).toContain('$89.99'); // unit price
      });

      it('should handle items without product', () => {
        const orderWithBadItem = {
          ...mockOrder,
          items: [{ id: 'bad-item', quantity: 1, price: 10, product: null }],
        };
        const result = (service as any).buildItemsTable(orderWithBadItem);

        expect(result).toContain('Order Items');
      });
    });

    describe('buildAddressSection - Address HTML', () => {
      it('should build address section with order details', () => {
        const companyInfo = { name: 'Velora Inc.' };
        const result = (service as any).buildAddressSection(mockOrder, companyInfo);

        expect(result).toContain('Sold By');
        expect(result).toContain('Velora Inc.');
        expect(result).toContain('Billing Address');
        expect(result).toContain('John Doe');
        expect(result).toContain('123 Main St');
        expect(result).toContain('Shipping Address');
      });

      it('should use defaults when company info not provided', () => {
        const result = (service as any).buildAddressSection(mockOrder, {});

        expect(result).toContain('Velora Inc.');
      });
    });

    describe('buildAmazonHeader - Header HTML', () => {
      it('should build header with logo', () => {
        const logoConfig = { maxHeight: '100px', maxWidth: '350px', fallbackText: 'Velora' };
        const companyInfo = { name: 'Velora Inc.' };
        const result = (service as any).buildAmazonHeader('https://example.com/logo.png', logoConfig, companyInfo);

        expect(result).toContain('Invoice');
        expect(result).toContain('https://example.com/logo.png');
      });

      it('should use text fallback when no logo', () => {
        const logoConfig = { fallbackText: 'Velora' };
        const companyInfo = { name: 'Velora Inc.' };
        const result = (service as any).buildAmazonHeader('', logoConfig, companyInfo);

        expect(result).toContain('Velora');
      });
    });

    describe('buildOrderInfoBar - Order Info HTML', () => {
      it('should build order info bar', () => {
        const result = (service as any).buildOrderInfoBar(
          mockOrder,
          'VL-TEST123',
          'Jan 15, 2024',
          'Feb 14, 2024',
          'Online Payment',
          'Confirmed'
        );

        expect(result).toContain('VL-TEST123');
        expect(result).toContain('Online Payment');
        expect(result).toContain('Confirmed');
        expect(result).toContain('Jan 15, 2024');
      });
    });

    describe('buildQRCodeSection - QR Code HTML', () => {
      it('should build QR code section', () => {
        const result = (service as any).buildQRCodeSection('data:image/png;base64,abc123', mockOrder.id);

        expect(result).toContain('Scan to View Order');
        expect(result).toContain('data:image/png;base64,abc123');
      });
    });

    describe('buildNotesSection - Notes HTML', () => {
      it('should build notes section', () => {
        const companyInfo = { email: 'support@velora.com', phone: '+1 (555) 123-4567' };
        const result = (service as any).buildNotesSection(companyInfo);

        expect(result).toContain('Important Notes');
        expect(result).toContain('support@velora.com');
        expect(result).toContain('Return Policy');
      });

      it('should use defaults when company info not provided', () => {
        const result = (service as any).buildNotesSection({});

        expect(result).toContain('support@velora.com');
      });
    });

    describe('buildAmazonFooter - Footer HTML', () => {
      it('should build footer with company info', () => {
        const companyInfo = {
          name: 'Velora Inc.',
          address: '123 Business Ave',
          email: 'support@velora.com',
          phone: '+1 (555) 123-4567',
          website: 'www.velora.com',
        };
        const result = (service as any).buildAmazonFooter(companyInfo);

        expect(result).toContain('Velora Inc.');
        expect(result).toContain('123 Business Ave');
        expect(result).toContain('Thank you for shopping with Velora Inc.!');
      });

      it('should use defaults when company info not provided', () => {
        const result = (service as any).buildAmazonFooter({});

        expect(result).toContain('Velora Inc.');
        expect(result).toContain('support@velora.com');
      });
    });
  });

  describe('buildNotesSection - Notes HTML', () => {
    it('should build notes section', () => {
      const companyInfo = { email: 'support@velora.com', phone: '+1 (555) 123-4567' };
      const result = (service as any).buildNotesSection(companyInfo);

      expect(result).toContain('Important Notes');
      expect(result).toContain('support@velora.com');
      expect(result).toContain('Return Policy');
    });

    it('should use defaults when company info not provided', () => {
      const result = (service as any).buildNotesSection({});

      expect(result).toContain('support@velora.com');
    });
  });
});
