import { Especialista } from '../entities/especialista.entity';

export abstract class EspecialistaRepositoryPort {
    abstract listarActivos(termino?: string): Promise<Especialista[]>;
    abstract buscarPorId(idEspecialista: number): Promise<Especialista | null>;
    abstract listarHabilitados(): Promise<any[]>;
    abstract obtenerDatosEspecialista(idEspecialista: number): Promise<any | null>;
}