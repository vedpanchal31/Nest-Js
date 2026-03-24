import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderStatus, PaymentMethod } from 'src/core/constants/app.constants';
import { OrderItem } from './order-item.entity';
import { DeliveryPartner } from '../../delivery-partners/entities/delivery-partner.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => DeliveryPartner, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner: DeliveryPartner;

  @Column({ type: 'smallint', default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'smallint', name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ name: 'address_line_1' })
  addressLine1: string;

  @Column({ name: 'address_line_2', nullable: true })
  addressLine2: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  region: string;

  @Column()
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
