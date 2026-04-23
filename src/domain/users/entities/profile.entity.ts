import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('profiles')
@Index(['email'])
@Index(['mobile']) // Mobile search
@Index(['countryShortcode']) // Country filtering
@Index(['countryShortcode', 'mobile'])
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'varchar', length: 5, nullable: true, name: 'country_code' })
  countryCode: string | null;

  @Column({
    type: 'varchar',
    length: 5,
    nullable: true,
    name: 'country_shortcode',
  })
  countryShortcode: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true, name: 'mobile' })
  mobile: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth: Date | null;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
