import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import {
    ParametrosRegistroInyeccion,
    RegistroInyeccionRepositoryPort,
} from '../../domain/ports/registro-inyeccion.repository.port';

@Injectable()
export class PostgresRegistroInyeccionRepository implements RegistroInyeccionRepositoryPort {
    constructor(
        @InjectDataSource(DB_CONNECTIONS.ETAPA2)
        private readonly dataSource: DataSource,
    ) { }

    async crearTransaccionCompleta(datos: ParametrosRegistroInyeccion) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Insertar Cabecera: registro_inyeccion
            const queryInyeccion = `
        INSERT INTO enfermeria.registro_inyeccion (
          id_persona, 
          id_especialista, 
          id_via_parenteral, 
          id_receta, 
          id_receta_manual, 
          estado, 
          id_user_created, 
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        RETURNING id;
      `;

            const resInyeccion = await queryRunner.query(queryInyeccion, [
                datos.idPersona,
                datos.idEspecialista ?? null,
                datos.idViaParenteral ?? null,
                datos.idReceta ?? null,
                datos.idRecetaManual ?? null,
                datos.idUsuario ?? null,
            ]);

            const idRegistroInyeccion = resInyeccion[0].id;

            // 2. Insertar Detalle de Medicamentos
            let totalMedicamentos = 0;
            if (datos.medicamentos && datos.medicamentos.length > 0) {
                for (const med of datos.medicamentos) {
                    const queryMed = `
            INSERT INTO enfermeria.registro_inyeccion_medicamento (
              id_registro_inyeccion,
              id_medicamento,
              observacion,
              estado,
              id_user_created,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, true, $4, NOW(), NOW());
          `;
                    await queryRunner.query(queryMed, [
                        idRegistroInyeccion,
                        med.idMedicamento,
                        med.observacion ?? null,
                        datos.idUsuario ?? null,
                    ]);
                    totalMedicamentos++;
                }
            }

            // 3. Insertar Checklist de Procedimientos
            let procedimientosRegistrados = false;
            if (datos.procedimientos) {
                const p = datos.procedimientos;
                const queryProc = `
          INSERT INTO enfermeria.registro_inyeccion_procedimiento (
            id_registro_inyeccion,
            curacion_plana,
            curacion_infectada,
            oxigenoterapia,
            retiro_puntos,
            prueba_sensibilidad,
            sangria,
            signos_vitales,
            tx_vo,
            orientacion_salud,
            vendajes,
            nebulizacion,
            otros,
            observaciones,
            estado,
            id_user_created,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, NOW(), NOW()
          );
        `;
                await queryRunner.query(queryProc, [
                    idRegistroInyeccion,
                    p.curacionPlana ?? false,
                    p.curacionInfectada ?? false,
                    p.oxigenoterapia ?? false,
                    p.retiroPuntos ?? false,
                    p.pruebaSensibilidad ?? false,
                    p.sangria ?? false,
                    p.signosVitales ?? false,
                    p.txVo ?? false,
                    p.orientacionSalud ?? false,
                    p.vendajes ?? false,
                    p.nebulizacion ?? false,
                    p.otros ?? null,
                    p.observaciones ?? null,
                    datos.idUsuario ?? null,
                ]);
                procedimientosRegistrados = true;
            }

            await queryRunner.commitTransaction();

            return {
                idRegistroInyeccion,
                totalMedicamentos,
                procedimientosRegistrados,
            };
        } catch (error: any) {
            await queryRunner.rollbackTransaction();
            throw new InternalServerErrorException(
                `Error al registrar inyección y procedimientos: ${error.message}`,
            );
        } finally {
            await queryRunner.release();
        }
    }

    async buscarPorPaciente(idPersona: number) {
        const query = `
      SELECT 
        ri.id,
        ri.id_persona,
        ri.id_especialista,
        ri.id_via_parenteral,
        vp.nombre AS via_parenteral_nombre,
        ri.id_receta,
        ri.id_receta_manual,
        ri.created_at,
        (
          SELECT json_agg(json_build_object(
            'id', rim.id,
            'id_medicamento', rim.id_medicamento,
            'observacion', rim.observacion
          ))
          FROM enfermeria.registro_inyeccion_medicamento rim
          WHERE rim.id_registro_inyeccion = ri.id AND rim.estado = true
        ) AS medicamentos,
        (
          SELECT row_to_json(rip.*)
          FROM enfermeria.registro_inyeccion_procedimiento rip
          WHERE rip.id_registro_inyeccion = ri.id AND rip.estado = true
        ) AS procedimientos
      FROM enfermeria.registro_inyeccion ri
      LEFT JOIN enfermeria.via_parenteral vp ON vp.id = ri.id_via_parenteral
      WHERE ri.id_persona = $1 AND ri.estado = true
      ORDER BY ri.created_at DESC;
    `;
        return await this.dataSource.query(query, [idPersona]);
    }

    async buscarPorId(id: number) {
        const query = `
      SELECT 
        ri.*,
        vp.nombre AS via_parenteral_nombre
      FROM enfermeria.registro_inyeccion ri
      LEFT JOIN enfermeria.via_parenteral vp ON vp.id = ri.id_via_parenteral
      WHERE ri.id = $1 AND ri.estado = true
      LIMIT 1;
    `;
        const rows = await this.dataSource.query(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }
}