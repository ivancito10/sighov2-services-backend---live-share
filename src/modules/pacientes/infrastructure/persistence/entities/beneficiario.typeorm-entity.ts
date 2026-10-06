import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PersonaTypeOrmEntity } from './persona.typeorm-entity';
import { TitularTypeOrmEntity } from './titular.typeorm-entity';

@Entity({ schema: 'afiliacion', name: 'beneficiario' })
export class BeneficiarioTypeOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'id_persona', type: 'integer' })
    idPersona: number;

    @Column({ name: 'id_titular', type: 'integer' })
    idTitular: number;

    @ManyToOne(() => PersonaTypeOrmEntity, (p) => p.beneficiarios)
    @JoinColumn({ name: 'id_persona' })
    persona: PersonaTypeOrmEntity;

    @ManyToOne(() => TitularTypeOrmEntity)
    @JoinColumn({ name: 'id_titular' })
    titular: TitularTypeOrmEntity;
}