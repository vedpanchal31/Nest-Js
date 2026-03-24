import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryPartner } from './delivery-partner.entity';

@Entity('delivery_partner_status')
export class DeliveryPartnerStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => DeliveryPartner, (partner) => partner.status)
  @JoinColumn({ name: 'partner_id' })
  partner: DeliveryPartner;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  currentLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  currentLng: number;

  @Column({ name: 'last_seen_at', nullable: true })
  lastSeenAt: Date;

  @Column({ name: 'current_order_id', nullable: true })
  currentOrderId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
