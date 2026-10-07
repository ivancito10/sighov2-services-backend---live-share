import { paginationMeta } from '../../../common/application/pagination-meta';
import { PersonaPort, PersonaError, validarId } from '../domain/persona';

export class ConsultarPersonasUseCase {
    constructor(private readonly repo: PersonaPort) {}
    async listar(q: Record<string, unknown>) {
        if (
            Object.keys(q).some(
                (k) =>
                    ![
                        'pagina',
                        'limite',
                        'buscar',
                        'ci',
                        'complemento',
                        'matricula',
                        'nombre',
                    ].includes(k),
            )
        )
            throw new PersonaError(400, 'Filtro no permitido');
        const pagina = Number(validarId(q.pagina ?? '1', 1000000n));
        const limite = Number(validarId(q.limite ?? '20', 10000000n));
        for (const campo of [
            'buscar',
            'ci',
            'complemento',
            'matricula',
            'nombre',
        ]) {
            const valor = q[campo];
            if (
                valor !== undefined &&
                (typeof valor !== 'string' || valor.length > 100)
            )
                throw new PersonaError(400, `Filtro ${campo} inválido`);
        }
        const ci = (q.ci as string | undefined)?.trim();
        const complemento = (q.complemento as string | undefined)?.trim();
        if (q.complemento !== undefined && (!ci || !complemento))
            throw new PersonaError(
                400,
                'complemento requiere ci y ambos deben tener valor',
            );
        const buscar = ((q.buscar as string) ?? '').trim();
        const { datos, total } = await this.repo.listar({
            pagina,
            limite,
            buscar,
            ci,
            complemento,
            matricula: (q.matricula as string | undefined)?.trim(),
            nombre: (q.nombre as string | undefined)?.trim(),
        });
        return {
            datos,
            total,
            meta: paginationMeta(total, pagina, limite),
        };
    }
    async obtener(id: string) {
        const persona = await this.repo.obtener(validarId(id, 2147483647n));
        if (!persona) throw new PersonaError(404, 'Persona no encontrada');
        return persona;
    }
}