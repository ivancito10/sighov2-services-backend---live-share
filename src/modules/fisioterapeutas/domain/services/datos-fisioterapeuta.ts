import { RegistroFisioterapeutaError } from '../errors/registro-fisioterapeuta.error';
export function texto(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}
export function fechaValida(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}
export function generarMatricula(
    fecha: string,
    sexo: 'M' | 'F',
    nombres: string,
    primero: string | null,
    segundo: string | null,
): string {
    const letras = (s: string) =>
        Array.from(s.toUpperCase()).filter((c) => /\p{L}/u.test(c));
    const nombre = letras(nombres);
    const p = letras(primero ?? '');
    const s = letras(segundo ?? '');
    if (!fechaValida(fecha) || !nombre.length || (!p.length && !s.length))
        throw new RegistroFisioterapeutaError(
            'validacion',
            'Fecha, nombres y al menos un apellido son obligatorios',
        );
    const apellidos =
        p.length && s.length
            ? p[0] + s[0]
            : (p.length ? p : s).slice(0, 2).join('');
    if (apellidos.length < 2)
        throw new RegistroFisioterapeutaError(
            'validacion',
            'El apellido único debe tener al menos dos letras para generar la matrícula',
        );
    const mes = Number(fecha.slice(5, 7)) + (sexo === 'F' ? 50 : 0);
    return (
        fecha.slice(2, 4) +
        String(mes).padStart(2, '0') +
        fecha.slice(8, 10) +
        apellidos +
        nombre[0]
    );
}
export function generarEmail(
    nombres: string,
    primero: string | null,
    segundo: string | null,
    dominio: string,
): string {
    const limpiar = (s: string) =>
        s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z]/g, '');
    const n = limpiar(nombres),
        p = limpiar(primero ?? ''),
        s = limpiar(segundo ?? '');
    if (!n || (!p && !s))
        throw new RegistroFisioterapeutaError(
            'validacion',
            'No se puede generar el correo con esos nombres',
        );
    // Con un único apellido se usa ese apellido y su inicial; pendiente de confirmación institucional.
    const apellido = p || s;
    const local = n[0] + apellido + (p && s ? s[0] : apellido[0]);
    if (local.length > 64)
        throw new RegistroFisioterapeutaError(
            'validacion',
            'El nombre de correo generado supera 64 caracteres',
        );
    return local + '@' + dominio.toLowerCase();
}
