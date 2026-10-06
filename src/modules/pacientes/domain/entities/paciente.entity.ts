export class Paciente {
  constructor(
    public readonly idPersona: number,
    public readonly ci: string,
    public readonly matricula: string,
    public readonly nombreCompleto: string,
    public readonly fechaNacimiento: string,
    public readonly sexo: string,
    public readonly tipoAsegurado: string, // <-- "TITULAR", "BENEFICIARIO", "NO ASEGURADO"
    public readonly estado: boolean,
    public readonly institucion: string,
  ) { }
}