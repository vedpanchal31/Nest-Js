import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryPartner } from './entities/delivery-partner.entity';
import { Repository, DataSource, Not, LessThan } from 'typeorm';
import { DeliveryPartnerStatus } from './entities/delivery-partner-status.entity';
import { RegisterDeliveryPartnerDto } from './dtos/register-delivery-partner.dto';
import { User } from '../users/entities/user.entity';
import { OrderStatus, UserType } from 'src/core/constants/app.constants';
import {
  DeliveryRequest,
  RequestStatus,
} from './entities/delivery-request.entity';
import { Order } from '../orders/entities/order.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CloudinaryService,
  MulterFile,
} from 'src/core/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DeliveryPartnerService {
  constructor(
    @InjectRepository(DeliveryPartner)
    private readonly partnerRepository: Repository<DeliveryPartner>,

    @InjectRepository(DeliveryPartnerStatus)
    private readonly statusRepository: Repository<DeliveryPartnerStatus>,

    @InjectRepository(DeliveryRequest)
    private readonly requestRepository: Repository<DeliveryRequest>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly cloudinaryService: CloudinaryService,

    private readonly dataSource: DataSource,
  ) { }

  async register(dto: RegisterDeliveryPartnerDto, file?: MulterFile) {
    const {
      name,
      email,
      password,
      vehicleType,
      vehicleName,
      latitude,
      longitude,
    } = dto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Check if delivery partner already exists for this email
    const existingPartner = await this.usersRepository.findOne({
      where: { email, userType: UserType.DELIVERY_PARTNER },
    });

    if (existingPartner) {
      throw new BadRequestException(
        'Delivery partner already registered with this email',
      );
    }

    let imageUrl = '';
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'delivery-partners',
      );
      if ('secure_url' in uploadResult) {
        imageUrl = (uploadResult as UploadApiResponse).secure_url;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create user
      const user = queryRunner.manager.create(User, {
        name,
        email,
        password: hashedPassword,
        userType: UserType.DELIVERY_PARTNER,
        profile: {
          name,
          email,
        },
      });
      const savedUser = await queryRunner.manager.save(user);

      // 2. Create delivery partner
      const partner = queryRunner.manager.create(DeliveryPartner, {
        user: savedUser,
        vehicleType,
        vehicleName,
        rcBookPhoto: imageUrl,
      });
      const savedPartner = await queryRunner.manager.save(partner);

      // 3. Create delivery partner status
      const status = queryRunner.manager.create(DeliveryPartnerStatus, {
        partner: savedPartner,
        currentLat: latitude,
        currentLng: longitude,
        isOnline: false,
        isAvailable: true,
      });
      await queryRunner.manager.save(status);

      await queryRunner.commitTransaction();
      return savedPartner;
    } catch (_err) {
      await queryRunner.rollbackTransaction();
      throw _err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    const partner = await this.partnerRepository.findOne({
      where: { user: { id: userId } },
      relations: ['status'],
    });

    if (!partner) throw new NotFoundException('Delivery partner not found');

    partner.status.currentLat = lat;
    partner.status.currentLng = lng;
    partner.status.lastSeenAt = new Date();

    return await this.statusRepository.save(partner.status);
  }

  async toggleOnlineStatus(userId: string, isOnline: boolean) {
    const partner = await this.partnerRepository.findOne({
      where: { user: { id: userId } },
      relations: ['status'],
    });

    if (!partner) throw new NotFoundException('Delivery partner not found');

    partner.status.isOnline = isOnline;
    return await this.statusRepository.save(partner.status);
  }

  // Find nearby partners using Haversine Formula
  async findNearbyPartners(lat: number, lng: number, radiusKm: number = 10) {
    const query = this.statusRepository
      .createQueryBuilder('status')
      .leftJoinAndSelect('status.partner', 'partner')
      .leftJoinAndSelect('partner.user', 'user')
      .where('status.isOnline = :isOnline', { isOnline: true })
      .andWhere('status.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere(
        '(6371 * acos(cos(radians(:lat)) * cos(radians(status.currentLat)) * cos(radians(status.currentLng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(status.currentLat)))) <= :radius',
        { lat, lng, radius: radiusKm },
      )
      .orderBy(
        '(6371 * acos(cos(radians(:lat)) * cos(radians(status.currentLat)) * cos(radians(status.currentLng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(status.currentLat))))',
        'ASC',
      );

    return await query.getMany();
  }

  // DISPATCH LOGIC
  async dispatchOrder(
    orderId: string,
    lat: number,
    lng: number,
    attempt: number = 1,
  ): Promise<DeliveryRequest | null> {
    const radius = attempt * 10; // 10km, 20km, 30km...
    if (radius > 100) return null; // Stop searching after 100km

    const nearbyStatuses = await this.findNearbyPartners(lat, lng, radius);

    // Find a partner who hasn't rejected or expired this order yet
    for (const status of nearbyStatuses) {
      const alreadyRequested = await this.requestRepository.findOne({
        where: {
          order: { id: orderId },
          partner: { id: status.partner.id },
          status: Not(RequestStatus.EXPIRED),
        },
      });

      if (!alreadyRequested) {
        // Create a new request
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 30);

        const request = this.requestRepository.create({
          order: { id: orderId },
          partner: status.partner,
          expiresAt,
          status: RequestStatus.PENDING,
        });

        return await this.requestRepository.save(request);
      }
    }

    // If no one found in current radius, try expanding
    return this.dispatchOrder(orderId, lat, lng, attempt + 1);
  }

  async acceptRequest(requestId: string, userId: string) {
    const partner = await this.partnerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!partner) throw new NotFoundException('Partner profile not found');

    const request = await this.requestRepository.findOne({
      where: { id: requestId, partner: { id: partner.id } },
      relations: ['order', 'partner', 'partner.status'],
    });

    if (!request) throw new NotFoundException('Delivery request not found');
    if (request.status !== RequestStatus.PENDING)
      throw new BadRequestException('Request is no longer pending');
    if (new Date() > request.expiresAt) {
      request.status = RequestStatus.EXPIRED;
      await this.requestRepository.save(request);
      throw new BadRequestException('Request has expired');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Accept request
      request.status = RequestStatus.ACCEPTED;
      await queryRunner.manager.save(request);

      // 2. Assign partner to order
      await queryRunner.manager.update(Order, request.order.id, {
        status: OrderStatus.CONFIRMED,
        partner: { id: request.partner.id },
      });

      // 3. Mark partner as unavailable
      await queryRunner.manager.update(
        DeliveryPartnerStatus,
        { partner: { id: request.partner.id } },
        {
          isAvailable: false,
          currentOrderId: request.order.id,
        },
      );

      // 4. Expire all other pending requests for this order
      await queryRunner.manager
        .createQueryBuilder()
        .update(DeliveryRequest)
        .set({ status: RequestStatus.EXPIRED })
        .where('order_id = :orderId', { orderId: request.order.id })
        .andWhere('id != :requestId', { requestId: request.id })
        .andWhere('status = :status', { status: RequestStatus.PENDING })
        .execute();

      await queryRunner.commitTransaction();
      return request;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectRequest(requestId: string, userId: string) {
    const partner = await this.partnerRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!partner) throw new NotFoundException('Partner profile not found');

    const request = await this.requestRepository.findOne({
      where: { id: requestId, partner: { id: partner.id } },
      relations: ['order'],
    });

    if (!request) throw new NotFoundException('Request not found');

    request.status = RequestStatus.REJECTED;
    await this.requestRepository.save(request);

    // Re-dispatch logic: Triggers searching for the NEXT driver
    const order = await this.dataSource
      .getRepository(Order)
      .findOne({ where: { id: request.order.id } });

    if (!order) throw new NotFoundException('Order not found');

    void this.dispatchOrder(
      order.id,
      Number(order.latitude),
      Number(order.longitude),
    );

    return { message: 'Request rejected' };
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleExpiredRequests() {
    const now = new Date();
    const expiredRequests = await this.requestRepository.find({
      where: {
        status: RequestStatus.PENDING,
        expiresAt: LessThan(now),
      },
      relations: ['order'],
    });

    for (const request of expiredRequests) {
      request.status = RequestStatus.EXPIRED;
      await this.requestRepository.save(request);

      if (request.order) {
        // We find the NEXT nearest partner
        const orderId = request.order.id;
        const lat = Number(request.order.latitude);
        const lng = Number(request.order.longitude);

        const radius = 100;
        const nearbyPartners = await this.findNearbyPartners(lat, lng, radius);

        for (const status of nearbyPartners) {
          const pastRequest = await this.requestRepository.findOne({
            where: {
              order: { id: orderId },
              partner: { id: status.partner.id },
            },
          });

          if (!pastRequest || pastRequest.status === RequestStatus.EXPIRED) {
            await this.forceAssignOrder(orderId, status.partner.id);
            return;
          }
        }
      }
    }
  }

  async forceAssignOrder(orderId: string, partnerId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(Order, orderId, {
        status: OrderStatus.CONFIRMED,
        partner: { id: partnerId },
      });

      await queryRunner.manager.update(
        DeliveryPartnerStatus,
        { partner: { id: partnerId } },
        { isAvailable: false, currentOrderId: orderId },
      );

      const request = this.requestRepository.create({
        order: { id: orderId },
        partner: { id: partnerId },
        status: RequestStatus.ACCEPTED,
        expiresAt: new Date(),
      });
      await queryRunner.manager.save(request);

      await queryRunner.commitTransaction();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  // Dashboard Logic
  async getMyDashboard(userId: string) {
    const partner = await this.partnerRepository.findOne({
      where: { user: { id: userId } },
      relations: ['status'],
    });

    if (!partner) throw new NotFoundException('Partner profile not found');

    // 1. Invitations (PENDING requests)
    const invitations = await this.requestRepository.find({
      where: {
        partner: { id: partner.id },
        status: RequestStatus.PENDING,
        expiresAt: Not(LessThan(new Date())),
      },
      relations: ['order'],
    });

    // 2. Active Assignment (Orders assigned to them)
    const activeOrders = await this.orderRepository.find({
      where: {
        partner: { id: partner.id },
        status: Not(OrderStatus.DELIVERED),
      },
      relations: ['user'],
    });

    return {
      invitations,
      activeOrders,
      status: partner.status,
    };
  }

  // Management Logic
  async listAllPartners(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [partners, total] = await this.partnerRepository.findAndCount({
      relations: ['user', 'status'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: partners,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleVerification(partnerId: string, isVerified: boolean) {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    partner.isVerified = isVerified;
    return await this.partnerRepository.save(partner);
  }

  async deletePartner(partnerId: string) {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    return await this.partnerRepository.softRemove(partner);
  }
}
