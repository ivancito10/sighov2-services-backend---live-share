import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { DB_CONNECTIONS } from '../../../../config/database.constants';
import { PacienteRepositoryPort } from '../../domain/ports/paciente.repository.port';
import { Paciente, PacienteInstitucionDetalle } from '../../domain/entities/paciente.entity';
// Importa la interfaz aquí:
import { PaginatedResult } from '../../domain/ports/paginated-result.interface';

// Entidades TypeORM...
import { PersonaTypeOrmEntity } from './entities/persona.typeorm-entity';
import { TitularTypeOrmEntity } from './entities/titular.typeorm-entity';
import { TitularInstitucionTypeOrmEntity } from './entities/titular-institucion.typeorm-entity';
import { BeneficiarioTypeOrmEntity } from './entities/beneficiario.typeorm-entity';

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

  async buscarPorId(idPersona: number): Promise<Paciente | null> {
    // 1. Obtener la persona y su tipo de asegurado con TypeORM
    const persona = await this.personaRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.tipoAsegurado', 'ta')
      .where('p.id = :id', { id: idPersona })
      .getOne();

    if (!persona) return null;

    const tipoAseguradoStr = persona.tipoAsegurado?.nombre || 'NO ASEGURADO';
    let instituciones: PacienteInstitucionDetalle[] = [];

    // 2. Resolver instituciones según reglas de negocio usando TypeORM QueryBuilder
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
      // Buscar titular y sus instituciones
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
      // Buscar el id_titular asociado al beneficiario
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

    // 3. Determinar la institución prioritaria
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

    return new Paciente(
      persona.id,
      persona.ci || '',
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

  async buscarPacientes(
    filtros: {
      q?: string;
      ci?: string;
      matricula?: string;
      nombre?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedResult<Paciente>> {
    const paginaActual = Math.max(1, filtros.page || 1);
    const registrosPorPagina = Math.max(1, filtros.limit || 20);
    const skip = (paginaActual - 1) * registrosPorPagina;

    const qb = this.personaRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.tipoAsegurado', 'ta');

    if (filtros.ci && filtros.ci.trim().length > 0) {
      // 1. Búsqueda específica por Carnet y Complemento
     const ciRaw = filtros.ci.trim().toUpperCase();
      // Quitamos espacios y guiones para que coincida exactamente con la clave única sin separador
      const ciLimpio = ciRaw.replace(/[-\s]/g, '');

      qb.where(
        new Brackets((bracket) => {
          bracket
            // 1. Coincidencia directa contra clave_unica (limpia o con guion)
            .where('UPPER(p.claveUnica) = :ciLimpio', { ciLimpio })
            .orWhere('UPPER(p.claveUnica) = :ciRaw', { ciRaw })
            // 2. Coincidencia directa contra la columna CI
            .orWhere('UPPER(p.ci) = :ciLimpio', { ciLimpio })
            .orWhere('UPPER(p.ci) = :ciRaw', { ciRaw })
            // 3. Búsqueda flexible (LIKE) por si el usuario escribe solo los primeros dígitos
            .orWhere('UPPER(p.claveUnica) LIKE :ciLike', { ciLike: `${ciLimpio}%` });
        }),
      )
        .orderBy('p.pApellido', 'ASC')
        .addOrderBy('p.nombres', 'ASC');

    } else if (filtros.matricula && filtros.matricula.trim().length > 0) {
      // 2. Búsqueda específica por Matrícula
      qb.where('UPPER(COALESCE(p.matriculaSeguro, \'\')) LIKE :mat', {
        mat: `%${filtros.matricula.trim().toUpperCase()}%`,
      })
        .orderBy('p.pApellido', 'ASC')
        .addOrderBy('p.nombres', 'ASC');

    } else if (filtros.nombre && filtros.nombre.trim().length > 0) {
      // 3. Búsqueda específica por Nombre o Apellidos
      qb.where(
        "UPPER(CONCAT(p.nombres, ' ', p.pApellido, ' ', COALESCE(p.sApellido, ''))) LIKE :nom",
        {
          nom: `%${filtros.nombre.trim().toUpperCase()}%`,
        },
      )
        .orderBy('p.pApellido', 'ASC')
        .addOrderBy('p.nombres', 'ASC');

    } else if (filtros.q && filtros.q.trim().length > 0) {
      const rawTerm = filtros.q.trim();
      const termUpper = `%${rawTerm.toUpperCase()}%`;
      const termClean = rawTerm.replace(/[-\s]/g, '').toUpperCase();

      qb.where(
        new Brackets((bracket) => {
          bracket
            // Búsqueda directa en clave_unica y CI
            .where('UPPER(p.claveUnica) LIKE :termClean', { termClean: `%${termClean}%` })
            .orWhere('UPPER(p.ci) LIKE :term', { term: termUpper })
            // Matrícula
            .orWhere('UPPER(p.matriculaSeguro) LIKE :term', { term: termUpper })
            // Nombres y apellidos
            .orWhere(
              "UPPER(CONCAT(p.nombres, ' ', p.pApellido, ' ', COALESCE(p.sApellido, ''))) LIKE :term",
              { term: termUpper },
            );
        }),
      )
        .orderBy('p.pApellido', 'ASC')
        .addOrderBy('p.nombres', 'ASC');

    } else {
      // Sin filtros: orden natural
      qb.orderBy('p.id', 'DESC');
    }

    // Paginación con TypeORM
    const [personas, total] = await qb
      .skip(skip)
      .take(registrosPorPagina)
      .getManyAndCount();

    const data = personas.map((p) => {
      const nombreCompleto = [p.nombres, p.pApellido, p.sApellido]
        .filter(Boolean)
        .join(' ')
        .trim();

      const fechaNac = p.fechaNacimiento
        ? new Date(p.fechaNacimiento).toISOString().split('T')[0]
        : '';

      const tipoStr = p.tipoAsegurado?.nombre || 'TITULAR';

      let instRapida = 'PARTICULAR / SIN INSTITUCIÓN';
      if (p.idTipoAsegurado === 11 || tipoStr.toUpperCase().includes('ESTUDIANTE')) {
        instRapida = 'APORTE UMSA ESTUDIANTE';
      } else if ([9, 10].includes(p.idTipoAsegurado) || tipoStr.toUpperCase().includes('INTERIOR')) {
        instRapida = 'SEGURO SOCIAL UNIVERSITARIO DEL INTERIOR';
      }

      const ciCompleto = p.complemento && p.complemento.trim().length > 0
        ? `${p.ci}-${p.complemento.trim()}`
        : (p.ci || '');

      return new Paciente(
        p.id,
        ciCompleto,
        p.matriculaSeguro || '',
        nombreCompleto,
        fechaNac,
        p.sexo || '',
        tipoStr,
        p.afiliado ?? true,
        instRapida,
        [],
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