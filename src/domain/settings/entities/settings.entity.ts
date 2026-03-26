import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'Velora' })
  name: string;

  @Column({ default: 'Premium E-Commerce Solutions' })
  tagline: string;

  @Column({ default: '123 Business Avenue, New York, NY 10001' })
  address: string;

  @Column({ default: 'contact@velora.com' })
  email: string;

  @Column({ default: '+1 (555) 123-4567' })
  phone: string;

  @Column({ default: 'https://velora.com' })
  website: string;

  @Column({ 
    default: 'https://res.cloudinary.com/dcegoonge/image/upload/v1774418520/company-logo/hugpvjg6op8enixjsrhk.png' 
  })
  logoUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
