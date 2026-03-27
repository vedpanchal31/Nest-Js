/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserType } from '../src/core/constants/app.constants';
import { OrdersController } from '../src/domain/orders/orders.controller';
import { OrderManagementController } from '../src/domain/orders/order-management.controller';
import { OrderService } from '../src/domain/orders/orders.service';
import { AuthGuard } from '../src/core/guards/auth.guard';
import { RoleGuard } from '../src/core/guards/role.guard';

describe('OrdersController (e2e)', () => {
  let app: INestApplication<App>;

  const mockOrder = {
    id: 'order-uuid',
    userId: 'user-uuid',
    status: 1,
    paymentMethod: 1,
    totalAmount: 199.98,
    addressLine1: '123 Main St',
    city: 'New York',
    state: 'NY',
    region: 'Manhattan',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrdersService = {
    createOrder: jest.fn().mockResolvedValue(mockOrder),
    getAllOrders: jest.fn().mockResolvedValue({
      data: [mockOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    getOrderSummary: jest.fn().mockResolvedValue(mockOrder),
    cancelOrder: jest.fn().mockResolvedValue({ ...mockOrder, status: 5 }),
    generateInvoice: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    getPublicOrderDetails: jest.fn().mockResolvedValue({
      orderId: 'order-uuid',
      status: 1,
      totalAmount: 199.98,
    }),
    renderOrderDetailsHTML: jest.fn().mockReturnValue('<html>Order Details</html>'),
    getManagementOrders: jest.fn().mockResolvedValue({
      data: [mockOrder],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    getManagementOrderDetails: jest.fn().mockResolvedValue(mockOrder),
    updateOrderStatus: jest.fn().mockResolvedValue({ ...mockOrder, status: 2 }),
    deleteOrder: jest.fn().mockResolvedValue(mockOrder),
    generateOrdersExcelReport: jest.fn().mockResolvedValue(Buffer.from('excel-content')),
  };

  const mockAuthGuard: CanActivate = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: 'user-uuid',
        email: 'user@example.com',
        type: 1,
        userType: UserType.USER,
      };
      return true;
    }),
  };

  const mockRoleGuard: CanActivate = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController, OrderManagementController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();

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

  describe('POST /orders', () => {
    it('should create order successfully', async () => {
      const createDto = {
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        region: 'Manhattan',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.006,
        paymentMethod: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it('should return 400 when addressLine1 is missing', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          city: 'New York',
          state: 'NY',
          region: 'Manhattan',
          country: 'USA',
          latitude: 40.7128,
          longitude: -74.006,
          paymentMethod: 1,
        })
        .expect(400);
    });

    it('should return 400 when city is missing', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          addressLine1: '123 Main St',
          state: 'NY',
          region: 'Manhattan',
          country: 'USA',
          latitude: 40.7128,
          longitude: -74.006,
          paymentMethod: 1,
        })
        .expect(400);
    });
  });

  describe('GET /orders', () => {
    it('should return paginated orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders?page=1&limit=10')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBe(1);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${mockOrder.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('PATCH /orders/:id/cancel', () => {
    it('should cancel order successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/orders/${mockOrder.id}/cancel`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.status).toBe(5);
    });
  });

  describe('GET /orders/public/:id', () => {
    it('should return public order details without auth', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/public/${mockOrder.id}`)
        .expect(200);

      expect(response.text).toContain('Order Details');
    });
  });

  describe('GET /order-management', () => {
    it('should return management orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/order-management?page=1&limit=10')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should apply status filter', async () => {
      await request(app.getHttpServer())
        .get('/order-management?page=1&limit=10&status=2')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(mockOrdersService.getManagementOrders).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        10,
        2,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('PATCH /order-management/:id/status', () => {
    it('should update order status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/order-management/${mockOrder.id}/status`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({ status: 2 })
        .expect(200);

      expect(response.body.status).toBe(2);
    });

    it('should return 400 when status is missing', async () => {
      await request(app.getHttpServer())
        .patch(`/order-management/${mockOrder.id}/status`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /order-management/:id', () => {
    it('should delete order successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/order-management/${mockOrder.id}`)
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
