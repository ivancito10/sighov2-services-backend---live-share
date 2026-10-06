import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TitularTypeOrmEntity } from './titular.typeorm-entity';
import { InstitucionTypeOrmEntity } from './institucion.typeorm-entity';

@Entity({ schema: 'afiliacion', name: 'titular_institucion' })
export class TitularInstitucionTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_titular', type: 'integer' })
  idTitular: number;

  @Column({ name: 'id_institucion', type: 'integer' })
  idInstitucion: number;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @Column({ name: 'tipo_institucion', type: 'varchar', nullable: true })
  tipoInstitucion: string;

  @Column({ name: 'fecha_baja', type: 'date', nullable: true })
  fechaBaja: Date;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;

  // Tipado explícito de 't' para evitar el error de parámetro any
  @ManyToOne(() => TitularTypeOrmEntity, (t: TitularTypeOrmEntity) => t.titularInstituciones)
  @JoinColumn({ name: 'id_titular' })
  titular: TitularTypeOrmEntity;

  @ManyToOne(() => InstitucionTypeOrmEntity)
  @JoinColumn({ name: 'id_institucion' })
  institucion: InstitucionTypeOrmEntity;
}