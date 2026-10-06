const listado = `e.id AS "idEspecialista", p.id AS "idPersona", p.ci, p.complemento, p.matricula_seguro AS matricula,
 TRIM(CONCAT_WS(' ',p.nombres,NULLIF(p.p_apellido,''),NULLIF(p.s_apellido,''))) AS "nombreCompleto",
 CASE WHEN e.permanente IS TRUE THEN 'PERMANENTE' WHEN e.permanente IS FALSE THEN 'EVENTUAL' ELSE NULL END AS "tipoContrato",
 CASE WHEN e.permanente THEN NULL ELSE e.fecha_contrato_inicio::text END AS "contratoDesde",
 CASE WHEN e.permanente THEN NULL ELSE e.fecha_contrato_fin::text END AS "contratoHasta", e.estado`;
const datosModal = `p.nombres,p.p_apellido AS "primerApellido",p.s_apellido AS "segundoApellido",
 p.fecha_nacimiento::text AS "fechaNacimiento",p.sexo,e.foto,e.grado_academico AS "gradoAcademico",
 json_build_object('id',p.id_dept_exp,'sigla',d.sigla,'nombre',d.nombre) AS expedido,
 json_build_object('id',e.id_especialidad,'nombre',esp.especialidad) AS especialidad, p.es_extranjero AS "esExtranjero", CASE WHEN p.es_extranjero IS TRUE THEN 'EXTRANJERO' WHEN p.es_extranjero IS FALSE THEN 'NACIONAL' ELSE NULL END AS "tipoDocumento"`;
export { listado, datosModal };
