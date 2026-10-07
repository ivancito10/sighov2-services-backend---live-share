import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';
import { Paciente, PacienteInstitucionDetalle } from '../../domain/entities/paciente.entity';
import { PaginatedResult } from '../../domain/ports/paginated-result.interface';
// Entidades TypeORM
import { PersonaTypeOrmEntity } from './entities/persona.typeorm-entity';
import { TitularTypeOrmEntity } from './entities/titular.typeorm-entity';
import { TitularInstitucionTypeOrmEntity } from './entities/titular-institucion.typeorm-entity';
import { BeneficiarioTypeOrmEntity } from './entities/beneficiario.typeorm-entity';
export interface FiltrosBusquedaPaciente {
  q?: string;
  ci?: string;
  matricula?: string;
  nombre?: string;
  page?: number;
  limit?: number;
}
@Injectable()
export class PostgresPacienteRepository implements PacienteRepositoryPort {
  constructor(
    @InjectRepository(PersonaTypeOrmEntity, DB_CONNECTIONS.SIGHOV)
    private readonly personaRepo: Repository<PersonaTypeOrmEntity>,
    @InjectRepository(TitularTypeOrmEntity, DB_CONNECTIONS.SIGHOV)
    private readonly titularRepo: Repository<TitularTypeOrmEntity>,
    @InjectRepository(TitularInstitucionTypeOrmEntity, DB_CONNECTIONS.SIGHOV)
    private readonly titularInstitucionRepo: Repository<TitularInstitucionTypeOrmEntity>,
    @InjectRepository(BeneficiarioTypeOrmEntity, DB_CONNECTIONS.SIGHOV)
    private readonly beneficiarioRepo: Repository<BeneficiarioTypeOrmEntity>,
  ) {}
  // =========================================================================
  // 1. DETALLE COMPLETO POR ID (Resuelve árbol institucional)
  // =========================================================================
  async buscarPorId(idPersona: number): Promise<Paciente | null> {
    const persona = await this.personaRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.tipoAsegurado', 'ta')
      .where('p.id = :id', { id: idPersona })
      .getOne();
    if (!persona) return null;
    const tipoAseguradoStr = persona.tipoAsegurado?.nombre || 'NO ASEGURADO';
    let instituciones: PacienteInstitucionDetalle[] = [];
    if (persona.idTipoAsegurado === 11 || tipoAseguradoStr.toUpperCase().includes('ESTUDIANTE')) {
      instituciones.push({
        idInstitucion: 0,
        nombre: 'APORTE UMSA ESTUDIANTE',
        tipoInstitucion: 'ESTUDIANTIL',
        activo: true,
      });
    } else if (
      [9, 10].includes(persona.idTipoAsegurado) ||
      tipoAseguradoStr.toUpperCase().includes('INTERIOR')
    ) {
      instituciones.push({
        idInstitucion: 0,
        nombre: 'SEGURO SOCIAL UNIVERSITARIO DEL INTERIOR',
        tipoInstitucion: 'CONVENIO INTERIOR',
        activo: true,
      });
    } else if (tipoAseguradoStr.toUpperCase().includes('TITULAR')) {
      const titular = await this.titularRepo.findOne({
        where: { idPersona: persona.id },
      });
      if (titular) {
        const registros = await this.titularInstitucionRepo
          .createQueryBuilder('ti')
          .innerJoinAndSelect('ti.institucion', 'inst')
          .where('ti.idTitular = :idTitular', { idTitular: titular.id })
          .orderBy('ti.estado', 'DESC')
          .addOrderBy('ti.updatedAt', 'DESC', 'NULLS LAST')
          .getMany();
        instituciones = registros.map((r) => ({
          idInstitucion: r.institucion.id,
          nombre: r.institucion.nombre,
          tipoInstitucion: r.tipoInstitucion || 'SIN DATO',
          activo: Boolean(r.estado),
        }));
      }
    } else if (tipoAseguradoStr.toUpperCase().includes('BENEFICIARIO')) {
      const beneficiario = await this.beneficiarioRepo.findOne({
        where: { idPersona: persona.id },
      });
      if (beneficiario?.idTitular) {
        const registros = await this.titularInstitucionRepo
          .createQueryBuilder('ti')
          .innerJoinAndSelect('ti.institucion', 'inst')
          .where('ti.idTitular = :idTitular', { idTitular: beneficiario.idTitular })
          .orderBy('ti.estado', 'DESC')
          .addOrderBy('ti.updatedAt', 'DESC', 'NULLS LAST')
          .getMany();
        instituciones = registros.map((r) => ({
          idInstitucion: r.institucion.id,
          nombre: r.institucion.nombre,
          tipoInstitucion: r.tipoInstitucion || 'SIN DATO',
          activo: Boolean(r.estado),
        }));
      }
    }
    const instActivaPatronal = instituciones.find(
      (i) => i.activo && i.tipoInstitucion.toUpperCase() === 'PATRONAL',
    );
    const primeraActiva = instituciones.find((i) => i.activo);
    const institucionPrincipal =
      instActivaPatronal?.nombre ||
      primeraActiva?.nombre ||
      instituciones[0]?.nombre ||
      'PARTICULAR / SIN INSTITUCIÓN';
    const fechaNac = persona.fechaNacimiento
      ? new Date(persona.fechaNacimiento).toISOString().split('T')[0]
      : '';
    const nombreCompleto = [persona.nombres, persona.pApellido, persona.sApellido]
      .filter(Boolean)
      .join(' ')
      .trim();
    const ciCompleto =
      persona.complemento && persona.complemento.trim().length > 0
        ? `${persona.ci}-${persona.complemento.trim()}`
        : persona.ci || '';
    return new Paciente(
      persona.id,
      ciCompleto,
      persona.matriculaSeguro || '',
      nombreCompleto,
      fechaNac,
      persona.sexo || '',
      tipoAseguradoStr,
      persona.afiliado ?? true,
      institucionPrincipal,
      instituciones,
    );
  }
  // =========================================================================
  // 2. LISTADO Y BÚSQUEDA PAGINADA: Consume fn_listar_pacientes de PostgreSQL
  // =========================================================================
  async buscarPacientes(
    filtros: FiltrosBusquedaPaciente = {},
  ): Promise<PaginatedResult<Paciente>> {
    const paginaActual = Math.max(1, filtros.page || 1);
    //const registrosPorPagina = Math.min(Math.max(1, filtros.limit || 20), 100);
    // Temporal para pruebas de velocidad: acepta el límite que mandes por query param (o 20 por defecto)
    const registrosPorPagina = Math.max(1, filtros.limit || 20);
    const offset = (paginaActual - 1) * registrosPorPagina;
    // Llamada nativa a la función en PostgreSQL
    const rawRows = await this.personaRepo.query(
      `SELECT * FROM administracion.fn_listar_pacientes($1, $2, $3, $4, $5, $6)`,
      [
        filtros.q?.trim() || null,
        filtros.ci?.trim() || null,
        filtros.matricula?.trim() || null,
        filtros.nombre?.trim() || null,
        registrosPorPagina,
        offset,
      ],
    );
    const total = rawRows.length > 0 ? Number(rawRows[0].total_registros) : 0;
    const data = rawRows.map((row: any) => {
      const fechaNac = row.fecha_nacimiento
        ? new Date(row.fecha_nacimiento).toISOString().split('T')[0]
        : '';
      return new Paciente(
        row.id_persona,
        row.ci,
        row.matricula,
        row.nombre_completo,
        fechaNac,
        row.sexo,
        row.tipo_asegurado,
        row.afiliado,
        row.institucion,
        [], // Optimizado sin array pesado para listados
      );
    });
    const lastPage = Math.ceil(total / registrosPorPagina) || 1;
    return {
      data,
      meta: {
        total,
        page: paginaActual,
        lastPage,
        limit: registrosPorPagina,
        hasNextPage: paginaActual < lastPage,
        hasPrevPage: paginaActual > 1,
      },
    };
  }
  // =========================================================================
  // 3. BÚSQUEDA DIRECTA POR CI: Mantiene getOne() e Índices B-Tree
  // =========================================================================
  async buscarPorCi(ciTermino: string): Promise<Paciente | null> {
    const raw = ciTermino.trim().toUpperCase();
    const clean = raw.replace(/[-\s]/g, '');
    const persona = await this.personaRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.tipoAsegurado', 'ta')
      .where('p.idTipoAsegurado IS NOT NULL AND p.idTipoAsegurado > 0')
      .andWhere(
        new Brackets((bracket) => {
          bracket
            .where('p.claveUnica = :clean', { clean })
            .orWhere('p.claveUnica = :raw', { raw })
            .orWhere('p.ci = :clean', { clean })
            .orWhere('p.ci = :raw', { raw });
        }),
      )
      .getOne();
    if (!persona) {
      return null;
    }
    return await this.buscarPorId(persona.id);
  }
  // =========================================================================
  // 4. LISTADO RÁPIDO ADMINISTRACIÓN
  // =========================================================================
  async listarPacientesAdministracion(limite: number = 50): Promise<any[]> {
    const personas = await this.personaRepo
      .createQueryBuilder('p')
      .where('p.ci IS NOT NULL')
      .andWhere("p.ci != ''")
      .orderBy('p.id', 'DESC')
      .take(limite)
      .getMany();
    return personas.map((p) => ({
      nombres: p.nombres || '',
      p_apellido: p.pApellido || '',
      s_apellido: p.sApellido || '',
      matricula_seguro: p.matriculaSeguro || '',
      sexo: p.sexo || '',
      fecha_nacimiento: p.fechaNacimiento
        ? new Date(p.fechaNacimiento).toISOString().split('T')[0]
        : '',
      ci: p.ci || '',
      complemento: null,
      nacionalidad: 'nacional',
      telefono: 0,
      residencia: '',
    }));
  }
}
