import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DeliveryPartnerStatus } from './delivery-partner-status.entity';

@Entity('delivery_partners')
export class DeliveryPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'vehicle_type' })
  vehicleType: string;

  @Column({ name: 'vehicle_name' })
  vehicleName: string;

  @Column({ name: 'rc_book_photo', nullable: true })
  rcBookPhoto: string;

  @Column({ name: 'license_photo', nullable: true })
  licensePhoto: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @OneToOne(() => DeliveryPartnerStatus, (status) => status.partner, {
    cascade: true,
  })
  status: DeliveryPartnerStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
