import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { DeliveryPartner } from './delivery-partner.entity';

export enum RequestStatus {
  PENDING = 1,
  ACCEPTED = 2,
  REJECTED = 3,
  EXPIRED = 4,
}

@Entity('delivery_requests')
export class DeliveryRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => DeliveryPartner)
  @JoinColumn({ name: 'partner_id' })
  partner: DeliveryPartner;

  @Column({ type: 'int', default: RequestStatus.PENDING })
  status: RequestStatus;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
