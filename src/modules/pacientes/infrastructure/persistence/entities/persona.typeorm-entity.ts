import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TipoAseguradoTypeOrmEntity } from './tipo-asegurado.typeorm-entity';
import { TitularTypeOrmEntity } from './titular.typeorm-entity';
import { BeneficiarioTypeOrmEntity } from './beneficiario.typeorm-entity';

@Entity({ schema: 'administracion', name: 'persona' })
export class PersonaTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  ci: string;

  @Column({ name: 'matricula_seguro', type: 'varchar', nullable: true })
  matriculaSeguro: string;

  @Column({ type: 'varchar' })
  nombres: string;

  @Column({ name: 'p_apellido', type: 'varchar' })
  pApellido: string;

  @Column({ name: 's_apellido', type: 'varchar', nullable: true })
  sApellido: string;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento: Date;

  @Column({ type: 'varchar', nullable: true })
  sexo: string;

  @Column({ name: 'id_tipo_asegurado', type: 'integer', nullable: true })
  idTipoAsegurado: number;

  @Column({ type: 'boolean', default: true })
  afiliado: boolean;

  @ManyToOne(() => TipoAseguradoTypeOrmEntity)
  @JoinColumn({ name: 'id_tipo_asegurado' })
  tipoAsegurado: TipoAseguradoTypeOrmEntity;

  @OneToMany(() => TitularTypeOrmEntity, (t) => t.persona)
  titulares: TitularTypeOrmEntity[];

  @OneToMany(() => BeneficiarioTypeOrmEntity, (b) => b.persona)
  beneficiarios: BeneficiarioTypeOrmEntity[];
}