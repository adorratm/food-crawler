import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Food } from 'src/entities/food.entity';

@Entity('food_items')
export class FoodItem {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column()
  foodId: number;

  @ManyToOne(() => Food, (food) => food.foodItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'foodId' })
  food: Food;

  @Column()
  name: string; // Besin adı (enerji, protein, vs.)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number; // Besin değeri

  @Column()
  unit: string; // Birim (kcal, g, mg, μg, vs.)

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
