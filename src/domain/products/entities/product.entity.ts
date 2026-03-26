import { User } from 'src/domain/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from 'src/domain/categories/entities/category.entity';

@Entity('products')
@Index(['categoryId', 'status'])
@Index(['supplierId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column()
  image: string;

  @Column({ type: 'smallint', default: 1, name: 'status' })
  status: number;

  @Column({ type: 'uuid', name: 'supplier_id' })
  supplierId: string;

  @ManyToOne(() => User, (user) => user.products)
  @JoinColumn({ name: 'supplier_id' })
  supplier: User;

  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
