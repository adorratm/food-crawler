import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { FoodCategory } from './food-category.entity';
import { FoodItem } from './food-item.entity';

@Entity('foods')
@Index(['name', 'category'])
export class Food {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ unique: true })
  turkompId: string; // Türk Gıda Kompozisyonu ID'si

  @Column()
  name: string;

  @Column({ nullable: true })
  nameEn: string;

  @Column({ nullable: true })
  categoryId: number;

  @ManyToOne(() => FoodCategory, (category) => category.foods)
  @JoinColumn({ name: 'categoryId' })
  category: FoodCategory;

  @Column({ nullable: true })
  subCategory: string;

  @Column({ nullable: true })
  description: string;

  // Relations
  @OneToMany(() => FoodItem, (foodItem) => foodItem.food)
  foodItems: FoodItem[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
