import { Brackets, ILike } from 'typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import type { PersonaRow } from '../../../common/persistence/orm/entities';
import {
    patron,
    buscarPersona,
} from '../../../common/persistence/orm/lecturas';
import type { FiltroPersona } from '../domain/persona';

export function filtrarPersonas(
    q: SelectQueryBuilder<PersonaRow>,
    f: FiltroPersona,
) {
    const nombre = (valor: string) => {
        for (const palabra of valor.split(/\s+/).filter(Boolean)) {
            const like = ILike(patron(palabra));
            q.andWhere(
                new Brackets((b) =>
                    b
                        .where({ nombres: like })
                        .orWhere({ primerApellido: like })
                        .orWhere({ segundoApellido: like }),
                ),
            );
        }
    };
    // Con complemento se selecciona el documento exacto; sin él, el prefijo del CI.
    if (f.ci)
        q.andWhere({
            ci: ILike(
                f.complemento
                    ? patron(f.ci).slice(1, -1)
                    : patron(f.ci).slice(1),
            ),
        });
    if (f.complemento)
        q.andWhere({ complemento: ILike(patron(f.complemento).slice(1, -1)) });
    if (f.matricula) q.andWhere({ matricula: ILike(patron(f.matricula)) });
    if (f.nombre) nombre(f.nombre);
    // Compatibilidad del buscador general: términos que empiezan con un número son CI.
    if (f.buscar) {
        if (/^\d/.test(f.buscar))
            q.andWhere({ ci: ILike(patron(f.buscar).slice(1)) });
        else buscarPersona(q, f.buscar);
    }
    return q;
}
