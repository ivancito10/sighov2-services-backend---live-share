import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ schema: 'administracion', name: 'tipo_asegurado' })
export class TipoAseguradoTypeOrmEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'tipo_asegurado', type: 'varchar' })
  nombre: string;
}