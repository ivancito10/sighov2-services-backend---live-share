import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type {
    OpenAPIObject,
    SchemaObject,
    ParameterObject,
} from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import {
    configurarSwaggerAuth,
} from './swagger-auth';
import { AuthModule } from '../modules/auth/auth.module';
import { PacientesModule } from '../modules/pacientes/pacientes.module';
import { PersonasModule } from '../modules/personas/personas.module';
import { EspecialistasModule } from '../modules/especialistas/especialistas.module';
import { SedesModule } from '../modules/sedes/sedes.module';
import { FisioterapeutasModule } from '../modules/fisioterapeutas/fisioterapeutas.module';

const texto: SchemaObject = { type: 'string' };
const entero: SchemaObject = {
    type: 'integer',
    minimum: 1,
    maximum: 2147483647,
};
const nullable = (schema: SchemaObject): SchemaObject => ({
    ...schema,
    nullable: true,
});
const objeto = (properties: Record<string, SchemaObject>): SchemaObject => ({
    type: 'object',
    properties,
});
const catalogo = objeto({ id: nullable(entero), nombre: nullable(texto) });
const persona = objeto({
    id: entero,
    idPersona: entero,
    ci: texto,
    complemento: nullable(texto),
    nombres: texto,
    primerApellido: nullable(texto),
    segundoApellido: nullable(texto),
    nombreCompleto: texto,
    matricula: nullable(texto),
    sexo: nullable(texto),
    fechaNacimiento: nullable({ type: 'string', format: 'date' }),
    esExtranjero: nullable({ type: 'boolean' }),
    tipoDocumento: nullable({
        type: 'string',
        enum: ['NACIONAL', 'EXTRANJERO'],
    }),
    expedido: objeto({
        id: nullable(entero),
        nombre: nullable(texto),
        sigla: nullable(texto),
    }),
    estadoCivil: catalogo,
    municipioNacimiento: catalogo,
    tipoAsegurado: catalogo,
    usuarioCreador: catalogo,
    usuarioActualizador: catalogo,
    idEstadoCivil: nullable(entero),
    idDeptExp: nullable(entero),
    idNacimientoMunicipio: nullable(entero),
    idTipoAsegurado: entero,
    afiliado: { type: 'boolean' },
    estadoAsuss: nullable({ type: 'boolean' }),
    p_apellido: nullable(texto),
    s_apellido: nullable(texto),
    matricula_seguro: nullable(texto),
    fecha_nacimiento: nullable({ type: 'string', format: 'date' }),
});
const especialista = objeto(
    Object.fromEntries([
        ...Object.entries(persona.properties!).filter(([k]) =>
            [
                'idPersona',
                'ci',
                'complemento',
                'nombres',
                'primerApellido',
                'segundoApellido',
                'nombreCompleto',
                'matricula',
                'sexo',
                'fechaNacimiento',
                'esExtranjero',
                'tipoDocumento',
                'expedido',
            ].includes(k),
        ),
        ['idEspecialista', entero],
        ['especialidad', catalogo],
        ['estado', nullable({ type: 'boolean' })],
        [
            'tipoContrato',
            nullable({ type: 'string', enum: ['PERMANENTE', 'EVENTUAL'] }),
        ],
        ['contratoDesde', nullable({ type: 'string', format: 'date' })],
        ['contratoHasta', nullable({ type: 'string', format: 'date' })],
        ['foto', nullable(texto)],
        ['gradoAcademico', nullable(texto)],
    ]) as Record<string, SchemaObject>,
);
const sede = objeto({
    id: entero,
    ubicacion: nullable(texto),
    piso: nullable(texto),
    id_residencia: nullable(entero),
    residencia: nullable(texto),
});
const paciente = objeto({
    idPersona: entero,
    ci: texto,
    matricula: texto,
    nombreCompleto: texto,
    fechaNacimiento: nullable({ type: 'string', format: 'date' }),
    sexo: texto,
    tipoAsegurado: texto,
    estado: { type: 'boolean' },
    institucion: texto,
});
const pacienteAdministracion = objeto({
    nombres: texto,
    p_apellido: texto,
    s_apellido: texto,
    matricula_seguro: texto,
    sexo: texto,
    fecha_nacimiento: texto,
    ci: texto,
    complemento: nullable(texto),
    nacionalidad: texto,
    telefono: { type: 'number' },
    residencia: texto,
});
const query = (
    name: string,
    schema: SchemaObject,
    description?: string,
): ParameterObject => ({
    name,
    in: 'query',
    required: false,
    schema,
    description,
});
const pagina = (item: SchemaObject, total = true) =>
    objeto({
        datos: { type: 'array', items: item },
        ...(total ? { total: { type: 'integer' } as SchemaObject } : {}),
        paginacion: objeto({
            pagina: entero,
            limite: entero,
            total: { type: 'integer' },
            totalPaginas: { type: 'integer' },
        }),
    });
const json = (schema: SchemaObject) => ({ 'application/json': { schema } });
const error = (description: string) => ({
    description,
    content: json(
        objeto({
            statusCode: { type: 'integer' },
            message: { oneOf: [texto, { type: 'array', items: texto }] },
        }),
    ),
});

// Lista explícita: ningún otro endpoint del módulo de fisioterapeutas se publica aquí.
export function limitarDocumento(document: OpenAPIObject): OpenAPIObject {
    const rutas: Record<
        string,
        {
            tag: string;
            summary: string;
            schema: SchemaObject;
            detail?: boolean;
            list?: boolean;
        }
    > = {
        '/api/pacientes': {
            tag: 'Pacientes',
            summary:
                'Buscar pacientes por CI, matrícula o nombre (hasta 40 resultados)',
            schema: { type: 'array', items: paciente },
        },
        '/api/pacientes/{id}': {
            tag: 'Pacientes',
            summary: 'Consultar paciente por ID de persona',
            schema: nullable(paciente),
            detail: true,
        },
        '/api/s1/administracion/pacientes': {
            tag: 'Pacientes',
            summary: 'Listado de pacientes para administración / Laravel',
            schema: objeto({
                status: { type: 'integer', example: 200 },
                success: { type: 'boolean' },
                message: texto,
                data: { type: 'array', items: pacienteAdministracion },
            }),
        },
        '/api/personas': {
            tag: 'Personas',
            summary: 'Listar todas las personas (paginado)',
            schema: pagina(persona),
            list: true,
        },
        '/api/personas/{id}': {
            tag: 'Personas',
            summary: 'Consultar persona por ID',
            schema: persona,
            detail: true,
        },
        '/api/especialistas': {
            tag: 'Especialistas',
            summary: 'Listar especialistas activos y filtrar por especialidad',
            schema: pagina(especialista, false),
            list: true,
        },
        '/api/especialistas/{id}': {
            tag: 'Especialistas',
            summary: 'Consultar especialista por ID',
            schema: objeto({ especialista }),
            detail: true,
        },
        '/api/sedes': {
            tag: 'Sedes',
            summary: 'Listar sedes con residencia',
            schema: pagina(sede),
            list: true,
        },
        '/api/sedes/{id}': {
            tag: 'Sedes',
            summary: 'Consultar sede por ID',
            schema: sede,
            detail: true,
        },
        '/api/auth/login': {
            tag: 'Auth',
            summary: 'Iniciar sesión y obtener accessToken',
            schema: objeto({
                accessToken: texto,
                tokenType: { type: 'string', example: 'Bearer' },
                usuario: objeto({
                    id: texto,
                    username: texto,
                    id_persona: nullable(entero),
                    nombreCompleto: nullable(texto),
                    idEspecialista: nullable(entero),
                }),
            }),
        },
        '/api/fisioterapeutas/incorporaciones': {
            tag: 'Fisioterapia · Incorporaciones',
            summary: 'Crear o incorporar una persona a fisioterapia',
            schema: objeto({
                idPersona: entero,
                idEspecialista: entero,
                idUsuario: texto,
                personaCreada: { type: 'boolean' },
                especialistaCreado: { type: 'boolean' },
                usuarioCreado: { type: 'boolean' },
                email: nullable(texto),
                matricula: texto,
                passwordTemporal: {
                    type: 'string',
                    description:
                        'Solo se devuelve cuando se crea un usuario nuevo.',
                },
            }),
        },
    };
    document.paths = Object.fromEntries(
        Object.entries(document.paths).filter(([path]) => path in rutas),
    );
    document.components = {
        securitySchemes: document.components?.securitySchemes,
        schemas: {},
    };
    for (const [path, item] of Object.entries(document.paths)) {
        const meta = rutas[path];
        const method =
            path === '/api/auth/login' || path.endsWith('/incorporaciones')
                ? 'post'
                : 'get';
        const op = item[method]!;
        document.paths[path] = { [method]: op };
        op.tags = [meta.tag];
        op.summary = meta.summary;
        op.security = path === '/api/auth/login' ? [] : [{ bearer: [] }];
        op.parameters = [];
        op.responses = {
            [method === 'post' && path !== '/api/auth/login' ? '201' : '200']: {
                description: 'Operación exitosa',
                content: json(meta.schema),
            },
            '400': error('Datos o parámetros inválidos'),
            '401': error('Credenciales o token inválidos'),
        };
        if (meta.detail) {
            op.parameters.push({
                name: 'id',
                in: 'path',
                required: true,
                schema: entero,
            });
            op.responses['404'] = error('Registro no encontrado');
        }
        if (meta.list) {
            op.parameters.push(
                query('pagina', {
                    type: 'integer',
                    minimum: 1,
                    maximum: 1000000,
                    default: 1,
                }),
                query('limite', {
                    type: 'integer',
                    minimum: 1,
                    maximum: 100,
                    default: 20,
                }),
                query(
                    'buscar',
                    { type: 'string', maxLength: 100 },
                    'Búsqueda parcial',
                ),
            );
            if (path === '/api/especialistas')
                op.parameters.push(
                    query('q', texto, 'Alias de buscar'),
                    query(
                        'especialidad',
                        texto,
                        'Nombre o sigla de especialidad',
                    ),
                    query(
                        'idEspecialidad',
                        entero,
                        'ID exacto de especialidad',
                    ),
                );
        }
        if (path === '/api/pacientes')
            op.parameters.push(
                query(
                    'q',
                    texto,
                    'Búsqueda parcial por CI, matrícula o nombre',
                ),
            );
        if (path === '/api/s1/administracion/pacientes')
            op.parameters.push(
                query(
                    'limite',
                    { type: 'integer', default: 50 },
                    'Cantidad de resultados',
                ),
            );
        if (path === '/api/pacientes/{id}') {
            delete op.responses['404'];
            op.description =
                'El controlador actual devuelve null si no encuentra la persona.';
        }
        if (path === '/api/auth/login')
            op.requestBody = {
                required: true,
                content: json({
                    ...objeto({
                        username: {
                            type: 'string',
                            example: 'usuario@ssulapaz.org',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            writeOnly: true,
                        },
                    }),
                    required: ['username', 'password'],
                }),
            };
        if (path.endsWith('/incorporaciones')) {
            op.description =
                'Envía el formulario completo. idPersona es opcional: al omitirlo busca por CI y complemento, reutiliza la persona si existe o crea persona, especialista y usuario. Un idPersona explícito inexistente devuelve 404. Si hay varios especialistas o usuarios, indica sus IDs. Contrato EVENTUAL exige fechas. Conserva credenciales existentes. Ejecuta escrituras reales al pulsar Execute.';
            op.responses['404'] = error('Persona no encontrada');
            op.responses['409'] = error(
                'Documento duplicado o selección ambigua',
            );
            op.requestBody = {
                required: true,
                content: json({
                    ...objeto({
                        idPersona: { ...entero, example: 318 },
                        idEspecialista: entero,
                        idUsuario: {
                            type: 'string',
                            pattern: '^[1-9][0-9]{0,18}$',
                        },
                        ci: {
                            type: 'string',
                            maxLength: 30,
                            example: '123456',
                        },
                        complemento: nullable({
                            type: 'string',
                            maxLength: 10,
                        }),
                        nombres: {
                            type: 'string',
                            maxLength: 100,
                            example: 'ANA',
                        },
                        primerApellido: nullable({
                            type: 'string',
                            maxLength: 100,
                            example: 'PEREZ',
                        }),
                        segundoApellido: nullable({
                            type: 'string',
                            maxLength: 100,
                        }),
                        sexo: { type: 'string', enum: ['M', 'F'] },
                        esExtranjero: { type: 'boolean', example: false },
                        fechaNacimiento: {
                            type: 'string',
                            format: 'date',
                            example: '1990-05-12',
                        },
                        idEstadoCivil: entero,
                        idDeptExp: entero,
                        tipoContrato: {
                            type: 'string',
                            enum: ['PERMANENTE', 'EVENTUAL'],
                        },
                        fechaContratoInicio: nullable({
                            type: 'string',
                            format: 'date',
                        }),
                        fechaContratoFin: nullable({
                            type: 'string',
                            format: 'date',
                        }),
                        gradoAcademico: {
                            type: 'string',
                            enum: ['DOCTOR', 'LICENCIADO'],
                        },
                    }),
                    additionalProperties: false,
                    required: [
                        'ci',
                        'nombres',
                        'sexo',
                        'esExtranjero',
                        'fechaNacimiento',
                        'idEstadoCivil',
                        'idDeptExp',
                        'tipoContrato',
                        'gradoAcademico',
                    ],
                    example: {
                        idPersona: 318,
                        ci: '123456',
                        nombres: 'ANA',
                        primerApellido: 'PEREZ',
                        sexo: 'F',
                        esExtranjero: false,
                        fechaNacimiento: '1990-05-12',
                        idEstadoCivil: 1,
                        idDeptExp: 2,
                        tipoContrato: 'PERMANENTE',
                        gradoAcademico: 'LICENCIADO',
                    },
                }),
            };
        }
    }
    return document;
}

export function configurarSwagger(app: INestApplication) {
    const swaggerUser = process.env.SWAGGER_USER;
    const swaggerPassword = process.env.SWAGGER_PASSWORD;

    if (!swaggerUser || !swaggerPassword) {
        throw new Error(
            'SWAGGER_USER y SWAGGER_PASSWORD deben estar configurados',
        );
    }

    const swaggerAuth = basicAuth({
        challenge: true,

        users: {
            [swaggerUser]: swaggerPassword,
        },

        unauthorizedResponse: {
            statusCode: 401,
            message: 'Acceso no autorizado a la documentación API',
        },
    });

    configurarSwaggerAuth(app);

    // // Protege la interfaz Swagger
    // app.use('/api/docs', swaggerAuth);

    // MUY IMPORTANTE:
    // también protege el JSON de OpenAPI
    app.use('/api/docs-json', swaggerAuth);

    

    const config =
        new DocumentBuilder()
            .setTitle(
                'SIGHO · APIs de consulta',
            )
            .setVersion('1.0')
            .setDescription(
                'Inicia sesión en Auth, copia accessToken y pégalo en Authorize. Los IDs de ejemplo deben reemplazarse por registros reales.',
            )
            .addBearerAuth()
            .build();


    const document =
        limitarDocumento(
            SwaggerModule.createDocument(
                app,
                config,
                {
                    include: [
                        AuthModule,
                        PacientesModule,
                        PersonasModule,
                        EspecialistasModule,
                        SedesModule,
                        FisioterapeutasModule,
                    ],

                    deepScanRoutes: false,
                },
            ),
        );


    SwaggerModule.setup(
        'api/docs',
        app,
        document,
        {
            jsonDocumentUrl:
                'api/docs-json',

            swaggerOptions: {
                persistAuthorization: false,
                defaultModelsExpandDepth: -1,
            },

            customSiteTitle:
                'SIGHO · Swagger',

            customCss: `
                .swagger-ui .topbar {
                    background-color: #1b1b1b;
                }

                .swagger-ui .topbar-wrapper {
                    max-width: 1460px;
                }

                #swagger-logout-container {
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                }

                #swagger-logout-button {
                    background: #49cc90;
                    color: white;

                    border: none;
                    border-radius: 4px;

                    padding: 9px 18px;

                    font-size: 13px;
                    font-weight: 700;

                    cursor: pointer;

                    transition:
                        background .2s;
                }

                #swagger-logout-button:hover {
                    background: #3bb77e;
                }
            `,

            customJsStr: `
                (function () {

                    // ======================================
                    // COMPROBAR SESIÓN
                    // ======================================

                    async function comprobarSesion() {

                        try {

                            const response =
                                await fetch(
                                    '/api/docs/session',
                                    {
                                        method: 'GET',

                                        credentials:
                                            'same-origin',

                                        cache:
                                            'no-store',

                                        headers: {
                                            'Cache-Control':
                                                'no-cache'
                                        }
                                    }
                                );


                            if (
                                response.status === 401
                            ) {

                                window.location.replace(
                                    '/api/docs/login'
                                );

                                return false;
                            }


                            return true;

                        } catch (error) {

                            window.location.replace(
                                '/api/docs/login'
                            );

                            return false;

                        }

                    }


                    // ======================================
                    // BOTÓN CERRAR SESIÓN
                    // ======================================

                    function agregarBotonLogout() {

                        const topbar =
                            document.querySelector(
                                '.swagger-ui .topbar .topbar-wrapper'
                            );


                        if (!topbar) {
                            return;
                        }


                        if (
                            document.getElementById(
                                'swagger-logout-container'
                            )
                        ) {
                            return;
                        }


                        const container =
                            document.createElement(
                                'div'
                            );

                        container.id =
                            'swagger-logout-container';


                        const button =
                            document.createElement(
                                'button'
                            );

                        button.id =
                            'swagger-logout-button';

                        button.type =
                            'button';

                        button.textContent =
                            'Cerrar sesión';


                        button.addEventListener(
                            'click',
                            function () {

                                window.location.replace(
                                    '/api/docs/logout'
                                );

                            }
                        );


                        container.appendChild(
                            button
                        );

                        topbar.appendChild(
                            container
                        );

                    }


                    // ======================================
                    // AL CARGAR
                    // ======================================

                    window.addEventListener(
                        'load',
                        async function () {

                            const valido =
                                await comprobarSesion();

                            if (!valido) {
                                return;
                            }


                            // Swagger tarda un poco
                            // en crear la barra superior.

                            const observer =
                                new MutationObserver(
                                    function () {

                                        agregarBotonLogout();

                                    }
                                );


                            observer.observe(
                                document.body,
                                {
                                    childList: true,
                                    subtree: true
                                }
                            );


                            agregarBotonLogout();

                        }
                    );


                    // ======================================
                    // BOTÓN ATRÁS / ADELANTE
                    // ======================================

                    window.addEventListener(
                        'pageshow',
                        function () {

                            comprobarSesion();

                        }
                    );


                    // ======================================
                    // VOLVER A LA PESTAÑA
                    // ======================================

                    document.addEventListener(
                        'visibilitychange',
                        function () {

                            if (
                                document.visibilityState ===
                                'visible'
                            ) {

                                comprobarSesion();

                            }

                        }
                    );

                })();
            `,
        },
    );

    return document;
}