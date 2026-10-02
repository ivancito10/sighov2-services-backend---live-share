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
          // Armamos una observación compuesta para registrar la vía o receta si vino especificada en la fila
          const detallesFila = [
            med.observacion ? med.observacion.trim() : null,
            med.idViaParenteral ? `Vía: ${med.idViaParenteral}` : null,
            med.idReceta ? `Receta: ${med.idReceta}` : null,
            med.idRecetaManual ? `Receta Manual: ${med.idRecetaManual}` : null,
            med.cantidad ? `Cant: ${med.cantidad}` : null,
          ].filter(Boolean).join(' | ');

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
            detallesFila || null,
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

  // 1. Listar para la tabla principal (con buscador)
  // 1. Listar para la tabla principal (con buscador)
  async listarRegistros(buscar?: string, limite: number = 50): Promise<any[]> {
    const queryInyecciones = `
            SELECT 
                ri.id,
                ri.id_persona,
                ri.id_especialista,
                ri.id_via_parenteral,
                ri.id_receta,
                ri.id_receta_manual,
                ri.estado,
                ri.created_at
            FROM enfermeria.registro_inyeccion ri
            ORDER BY ri.id DESC
            LIMIT $1;
        `;
    const inyecciones = await this.dataSource.query(queryInyecciones, [limite * 2]);

    if (!inyecciones || inyecciones.length === 0) return [];

    const idsPersona = Array.from(new Set(inyecciones.map((r: any) => r.id_persona)));

    const queryPersonas = `
            SELECT 
                p.id,
                TRIM(CONCAT(p.nombres, ' ', p.p_apellido, ' ', COALESCE(p.s_apellido, ''))) AS nombre_paciente,
                COALESCE(p.ci, '') AS ci,
                COALESCE(p.matricula_seguro, '') AS matricula
            FROM administracion.persona p
            WHERE p.id = ANY($1);
        `;

    const personasMap = new Map<number, any>();
    try {
      const personasRows = await this.dataSource.query(queryPersonas, [idsPersona]);
      for (const per of personasRows) {
        personasMap.set(per.id, per);
      }
    } catch {
      // Manejo preventivo si personas se encuentra en otra base
    }

    const resultado = inyecciones.map((ri: any) => {
      const persona = personasMap.get(ri.id_persona) || {
        nombre_paciente: 'PACIENTE SSU',
        ci: String(ri.id_persona),
        matricula: String(ri.id_persona),
      };

      const nroReceta = ri.id_receta ? String(ri.id_receta) : 'S/N';
      const esRecetaManual = !ri.id_receta;

      return {
        id: ri.id,
        nombre_paciente: persona.nombre_paciente,
        ci: persona.ci,
        matricula: persona.matricula,
        nro_receta: nroReceta,
        es_manual: esRecetaManual,
        estado: ri.estado,
        fecha_registro: ri.created_at,
      };
    });

    if (buscar && buscar.trim().length > 0) {
      const term = buscar.trim().toUpperCase();
      return resultado.filter((item: any) =>
        item.nombre_paciente.toUpperCase().includes(term) ||
        item.ci.includes(term) ||
        item.matricula.toUpperCase().includes(term) ||
        item.nro_receta.toUpperCase().includes(term),
      ).slice(0, limite);
    }

    return resultado.slice(0, limite);
  }

  // 2. Obtener el detalle completo para el modal "Ver" o para cargar "Editar"
  async obtenerDetalleCompleto(idRegistro: number): Promise<any | null> {
    const queryCab = `
            SELECT 
                ri.id,
                ri.id_persona,
                ri.id_especialista,
                ri.id_via_parenteral,
                vp.nombre AS via_parenteral_nombre,
                ri.id_receta,
                ri.id_receta_manual,
                ri.estado,
                ri.created_at
            FROM enfermeria.registro_inyeccion ri
            LEFT JOIN enfermeria.via_parenteral vp ON vp.id = ri.id_via_parenteral
            WHERE ri.id = $1
            LIMIT 1;
        `;
    const cabRows = await this.dataSource.query(queryCab, [idRegistro]);
    if (!cabRows || cabRows.length === 0) return null;
    const cabecera = cabRows[0];

    const queryMeds = `
            SELECT 
                rim.id,
                rim.id_medicamento,
                fm.nombre AS medicamento_nombre,
                rim.observacion,
                rim.estado
            FROM enfermeria.registro_inyeccion_medicamento rim
            LEFT JOIN farmacia.medicamento fm ON fm.id = rim.id_medicamento
            WHERE rim.id_registro_inyeccion = $1 AND rim.estado = true;
        `;
    const medicamentos = await this.dataSource.query(queryMeds, [idRegistro]);

    const queryProc = `
            SELECT 
                rip.*
            FROM enfermeria.registro_inyeccion_procedimiento rip
            WHERE rip.id_registro_inyeccion = $1 AND rip.estado = true
            LIMIT 1;
        `;
    const procRows = await this.dataSource.query(queryProc, [idRegistro]);
    const procedimientos = procRows.length > 0 ? procRows[0] : null;

    return {
      ...cabecera,
      es_receta_manual: !cabecera.id_receta,
      permite_editar_todo: !cabecera.id_receta,
      medicamentos,
      procedimientos,
    };
  }

  // 3. Cambiar estado (Activar / Anular)
  async cambiarEstado(idRegistro: number, estado: boolean, idUsuario?: number): Promise<boolean> {
    const query = `
            UPDATE enfermeria.registro_inyeccion
            SET estado = $1, id_user_updated = $2, updated_at = NOW()
            WHERE id = $3;
        `;
    const res = await this.dataSource.query(query, [estado, idUsuario ?? null, idRegistro]);
    return res[1] > 0;
  }

  async actualizarTransaccion(idRegistro: number, datos: any, idUsuario?: number): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener el registro actual para saber si es de Sistema o Manual
      const checkQuery = `
      SELECT id, id_persona, id_especialista, id_via_parenteral, id_receta, id_receta_manual 
      FROM enfermeria.registro_inyeccion 
      WHERE id = $1 AND estado = true;
    `;
      const checkRows = await queryRunner.query(checkQuery, [idRegistro]);
      if (!checkRows || checkRows.length === 0) {
        throw new Error(`Registro de inyección #${idRegistro} no encontrado o inactivo`);
      }

      const registroActual = checkRows[0];
      const esRecetaSistema = Boolean(registroActual.id_receta);

      // 2. Actualización de Cabecera según el tipo de receta
      if (esRecetaSistema) {
        // CASO SISTEMA: Paciente y Especialista quedan intactos. Solo se actualiza la vía principal.
        const updateCabeceraSistema = `
        UPDATE enfermeria.registro_inyeccion
        SET id_via_parenteral = COALESCE($1, id_via_parenteral),
            id_user_updated = $2,
            updated_at = NOW()
        WHERE id = $3;
      `;
        await queryRunner.query(updateCabeceraSistema, [
          datos.idViaParenteral ?? null,
          idUsuario ?? null,
          idRegistro,
        ]);
      } else {
        // CASO MANUAL (Imagen 3): Se puede editar TODO (paciente, médico, vía)
        const updateCabeceraManual = `
        UPDATE enfermeria.registro_inyeccion
        SET id_persona = COALESCE($1, id_persona),
            id_especialista = COALESCE($2, id_especialista),
            id_via_parenteral = COALESCE($3, id_via_parenteral),
            id_user_updated = $4,
            updated_at = NOW()
        WHERE id = $5;
      `;
        await queryRunner.query(updateCabeceraManual, [
          datos.idPersona ?? null,
          datos.idEspecialista ?? null,
          datos.idViaParenteral ?? null,
          idUsuario ?? null,
          idRegistro,
        ]);

        // Si tiene receta manual asociada, actualizamos también el registro en enfermeria.receta_manual
        if (registroActual.id_receta_manual) {
          const updateRecetaManual = `
          UPDATE enfermeria.receta_manual
          SET id_persona = COALESCE($1, id_persona),
              id_especialista = COALESCE($2, id_especialista),
              fecha_receta = COALESCE($3, fecha_receta),
              id_user_updated = $4,
              updated_at = NOW()
          WHERE id = $5;
        `;
          await queryRunner.query(updateRecetaManual, [
            datos.idPersona ?? null,
            datos.idEspecialista ?? null,
            datos.fechaReceta ?? null,
            idUsuario ?? null,
            registroActual.id_receta_manual,
          ]);
        }
      }

      // 3. Actualización de la Tabla de Medicamentos Aplicados
      if (datos.medicamentos && datos.medicamentos.length > 0) {
        // Desactivamos lógicamente los medicamentos previos vinculados a esta inyección
        await queryRunner.query(
          `UPDATE enfermeria.registro_inyeccion_medicamento 
         SET estado = false, id_user_updated = $1, updated_at = NOW() 
         WHERE id_registro_inyeccion = $2;`,
          [idUsuario ?? null, idRegistro]
        );

        // Insertamos los medicamentos actualizados de la tabla dinámica
        for (const med of datos.medicamentos) {
          const detallesFila = [
            med.observacion ? med.observacion.trim() : null,
            med.idViaParenteral ? `Vía: ${med.idViaParenteral}` : null,
            med.idReceta ? `Receta: ${med.idReceta}` : null,
            med.idRecetaManual ? `Receta Manual: ${med.idRecetaManual}` : null,
          ].filter(Boolean).join(' | ');

          const insertMed = `
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

          await queryRunner.query(insertMed, [
            idRegistro,
            med.idMedicamento,
            detallesFila || null,
            idUsuario ?? null,
          ]);
        }
      }

      // 4. Actualización del Panel de Procedimientos Complementarios
      if (datos.procedimientos) {
        const p = datos.procedimientos;
        const updateProc = `
        UPDATE enfermeria.registro_inyeccion_procedimiento
        SET curacion_plana = COALESCE($1, curacion_plana),
            curacion_infectada = COALESCE($2, curacion_infectada),
            oxigenoterapia = COALESCE($3, oxigenoterapia),
            retiro_puntos = COALESCE($4, retiro_puntos),
            prueba_sensibilidad = COALESCE($5, prueba_sensibilidad),
            sangria = COALESCE($6, sangria),
            signos_vitales = COALESCE($7, signos_vitales),
            tx_vo = COALESCE($8, tx_vo),
            orientacion_salud = COALESCE($9, orientacion_salud),
            vendajes = COALESCE($10, vendajes),
            nebulizacion = COALESCE($11, nebulizacion),
            observaciones = COALESCE($12, observaciones),
            id_user_updated = $13,
            updated_at = NOW()
        WHERE id_registro_inyeccion = $14;
      `;
        await queryRunner.query(updateProc, [
          p.curacionPlana ?? null,
          p.curacionInfectada ?? null,
          p.oxigenoterapia ?? null,
          p.retiroPuntos ?? null,
          p.pruebaSensibilidad ?? null,
          p.sangria ?? null,
          p.signosVitales ?? null,
          p.txVo ?? null,
          p.orientacionSalud ?? null,
          p.vendajes ?? null,
          p.nebulizacion ?? null,
          p.observaciones ?? null,
          idUsuario ?? null,
          idRegistro,
        ]);
      }

      await queryRunner.commitTransaction();
      return true;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`Error al actualizar inyección: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}