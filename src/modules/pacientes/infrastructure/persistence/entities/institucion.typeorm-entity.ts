import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'aportes', name: 'institucion' })
export class InstitucionTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  nombre: string;
}