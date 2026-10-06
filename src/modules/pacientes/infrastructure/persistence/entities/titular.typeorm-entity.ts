import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { PersonaTypeOrmEntity } from './persona.typeorm-entity';
import { TitularInstitucionTypeOrmEntity } from './titular-institucion.typeorm-entity';

@Entity({ schema: 'afiliacion', name: 'titular' })
export class TitularTypeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_persona', type: 'integer' })
  idPersona: number;

  @ManyToOne(() => PersonaTypeOrmEntity, (p) => p.titulares)
  @JoinColumn({ name: 'id_persona' })
  persona: PersonaTypeOrmEntity;

  @OneToMany(() => TitularInstitucionTypeOrmEntity, (ti) => ti.titular)
  titularInstituciones: TitularInstitucionTypeOrmEntity[];
}