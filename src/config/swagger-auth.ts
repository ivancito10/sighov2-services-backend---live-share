import type { INestApplication } from '@nestjs/common';
import type {
    Request,
    Response,
    NextFunction,
} from 'express';

import * as crypto from 'crypto';
import cookieParser from 'cookie-parser';
import express from 'express';

const COOKIE_NAME = 'sighov_swagger_session';

const SESSION_DURATION =
    8 * 60 * 60 * 1000; // 8 horas


function getEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `Variable de entorno requerida: ${name}`,
        );
    }

    return value;
}


function compararSeguro(valorA: string, valorB: string, ) : boolean {
    const bufferA = Buffer.from(valorA);
    const bufferB = Buffer.from(valorB);

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        bufferA,
        bufferB,
    );
}


function crearTokenSesion( username: string, ) : string {
    const secret = getEnv(
        'SWAGGER_SESSION_SECRET',
    );

    const expires =
        Date.now() + SESSION_DURATION;

    const contenido =
        `${username}:${expires}`;

    const firma = crypto
        .createHmac('sha256', secret)
        .update(contenido)
        .digest('hex');

    return Buffer.from(
        `${contenido}:${firma}`,
    ).toString('base64url');
}


function verificarTokenSesion(
    token?: string,
): boolean {
    if (!token) {
        return false;
    }

    try {
        const secret = getEnv(
            'SWAGGER_SESSION_SECRET',
        );

        const decoded = Buffer
            .from(token, 'base64url')
            .toString('utf8');

        const partes = decoded.split(':');

        if (partes.length !== 3) {
            return false;
        }

        const [
            username,
            expiresString,
            firma,
        ] = partes;

        const expires =
            Number(expiresString);

        if (
            !expires ||
            Date.now() > expires
        ) {
            return false;
        }

        const contenido =
            `${username}:${expires}`;

        const firmaEsperada = crypto
            .createHmac('sha256', secret)
            .update(contenido)
            .digest('hex');

        return compararSeguro(
            firma,
            firmaEsperada,
        );
    } catch {
        return false;
    }
}

function noCache( req: Request, res: Response, next: NextFunction, ) {
    res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private',
    );

    res.setHeader(
        'Pragma',
        'no-cache',
    );

    res.setHeader(
        'Expires',
        '0',
    );

    next();
}

function loginHtml(
    error = false,
): string {
    return `
<!DOCTYPE html>

<html lang="es">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        SIGHO · API Docs
    </title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                Arial,
                sans-serif;

            background: #f5f5f5;

            min-height: 100vh;

            color: #3b4151;
        }


        /* ============================= */
        /* HEADER                       */
        /* ============================= */

        .header {
            height: 72px;

            background: #1b1b1b;

            display: flex;

            align-items: center;

            padding: 0 40px;

            box-shadow:
                0 2px 8px
                rgba(0, 0, 0, .18);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 14px;

            color: white;

            font-size: 20px;
            font-weight: 700;
        }

        .api-badge {
            background: #49cc90;

            color: #fff;

            font-size: 12px;
            font-weight: 700;

            padding: 6px 10px;

            border-radius: 4px;
        }


        /* ============================= */
        /* CONTENIDO                    */
        /* ============================= */

        .container {
            min-height:
                calc(100vh - 72px);

            display: flex;

            justify-content: center;

            align-items: center;

            padding: 30px;
        }


        .login-card {
            width: 100%;
            max-width: 440px;

            background: #fff;

            border-radius: 7px;

            box-shadow:
                0 3px 15px
                rgba(0, 0, 0, .12);

            overflow: hidden;

            border:
                1px solid #e5e5e5;
        }


        .card-header {
            padding: 30px 32px 15px;
        }


        .title {
            margin: 0 0 8px;

            font-size: 26px;

            color: #3b4151;
        }


        .subtitle {
            margin: 0;

            color: #777;

            line-height: 1.5;

            font-size: 14px;
        }


        .form {
            padding:
                20px 32px 32px;
        }


        .field {
            margin-bottom: 20px;
        }


        label {
            display: block;

            margin-bottom: 8px;

            font-size: 14px;

            font-weight: 600;

            color: #3b4151;
        }


        input {
            width: 100%;

            height: 46px;

            padding: 0 13px;

            border:
                1px solid #d8d8d8;

            border-radius: 4px;

            font-size: 15px;

            outline: none;

            transition:
                border .2s,
                box-shadow .2s;
        }


        input:focus {
            border-color: #49cc90;

            box-shadow:
                0 0 0 3px
                rgba(73, 204, 144, .15);
        }


        .password-container {
            position: relative;
        }


        .password-container input {
            padding-right: 70px;
        }


        .show-password {
            position: absolute;

            right: 12px;
            top: 50%;

            transform:
                translateY(-50%);

            border: none;

            background: none;

            cursor: pointer;

            color: #49cc90;

            font-size: 13px;

            font-weight: 600;
        }


        .login-button {
            width: 100%;

            height: 47px;

            border: 0;

            border-radius: 4px;

            background: #49cc90;

            color: #fff;

            font-size: 15px;

            font-weight: 700;

            cursor: pointer;

            transition:
                background .2s,
                transform .1s;
        }


        .login-button:hover {
            background: #3bb77e;
        }


        .login-button:active {
            transform: scale(.99);
        }


        .error {
            margin-bottom: 20px;

            padding: 12px 14px;

            border-radius: 4px;

            border:
                1px solid #f93e3e;

            background: #fff5f5;

            color: #b62323;

            font-size: 14px;
        }


        .info {
            margin-top: 22px;

            padding-top: 20px;

            border-top:
                1px solid #eee;

            color: #888;

            font-size: 12px;

            line-height: 1.5;

            text-align: center;
        }


        .lock {
            width: 52px;
            height: 52px;

            display: flex;

            align-items: center;
            justify-content: center;

            margin-bottom: 20px;

            border-radius: 50%;

            background:
                rgba(73, 204, 144, .13);

            color: #49cc90;

            font-size: 23px;
        }


        @media (
            max-width: 600px
        ) {

            .header {
                padding: 0 20px;
            }

            .container {
                padding: 18px;
            }

            .card-header,
            .form {
                padding-left: 23px;
                padding-right: 23px;
            }

        }

    </style>

</head>


<body>

    <header class="header">

        <div class="brand">

            <span>
                SIGHO
            </span>

            <span class="api-badge">
                API
            </span>

        </div>

    </header>


    <main class="container">

        <div class="login-card">

            <div class="card-header">

                <div class="lock">
                    🔒
                </div>

                <h1 class="title">
                    Documentación API
                </h1>

                <p class="subtitle">
                    Área de acceso restringido
                    para personal autorizado.
                </p>

            </div>


            <form
                class="form"
                method="POST"
                action="/api/docs/login"
            >

                ${
                    error
                        ? `
                        <div class="error">
                            Usuario o contraseña incorrectos.
                        </div>
                        `
                        : ''
                }


                <div class="field">

                    <label for="username">
                        Usuario
                    </label>

                    <input
                        id="username"
                        name="username"
                        type="text"
                        autocomplete="username"
                        placeholder="Ingrese su usuario"
                        required
                        autofocus
                    >

                </div>


                <div class="field">

                    <label for="password">
                        Contraseña
                    </label>

                    <div
                        class="password-container"
                    >

                        <input
                            id="password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            placeholder="Ingrese su contraseña"
                            required
                        >

                        <button
                            type="button"
                            class="show-password"
                            onclick="mostrarPassword()"
                        >
                            Ver
                        </button>

                    </div>

                </div>


                <button
                    class="login-button"
                    type="submit"
                >
                    Ingresar a Swagger
                </button>


                <div class="info">

                    SIGHO V2 ·
                    Seguro Social Universitario La Paz

                    <br>

                    Acceso exclusivo para
                    personal autorizado.

                </div>

            </form>

        </div>

    </main>


    <script>

        function mostrarPassword() {

            const input =
                document.getElementById(
                    'password'
                );

            const button =
                document.querySelector(
                    '.show-password'
                );

            if (
                input.type === 'password'
            ) {

                input.type = 'text';

                button.textContent =
                    'Ocultar';

            } else {

                input.type = 'password';

                button.textContent =
                    'Ver';

            }

        }

    </script>

</body>

</html>
`;
}
export function configurarSwaggerAuth( app: INestApplication, ) {
    const server =
        app.getHttpAdapter()
            .getInstance();

    app.use(cookieParser());

    app.use(
        express.urlencoded({
            extended: false,
        }),
    );


    // ============================================
    // LOGIN
    // ============================================

    server.get(
        '/api/docs/login',
        (
            req: Request,
            res: Response,
        ) => {

            const token =
                req.cookies?.[
                    COOKIE_NAME
                ];

            if (
                verificarTokenSesion(
                    token,
                )
            ) {
                return res.redirect(
                    '/api/docs',
                );
            }

            const error =
                req.query.error === '1';

            return res
                .status(200)
                .send(
                    loginHtml(error),
                );
        },
    );


    server.post(
        '/api/docs/login',
        (
            req: Request,
            res: Response,
        ) => {

            const {
                username,
                password,
            } = req.body ?? {};

            const usuarioCorrecto =
                compararSeguro(
                    String(
                        username ?? '',
                    ),
                    getEnv(
                        'SWAGGER_USER',
                    ),
                );

            const passwordCorrecto =
                compararSeguro(
                    String(
                        password ?? '',
                    ),
                    getEnv(
                        'SWAGGER_PASSWORD',
                    ),
                );


            if (
                !usuarioCorrecto ||
                !passwordCorrecto
            ) {
                return res.redirect(
                    '/api/docs/login?error=1',
                );
            }


            const token =
                crearTokenSesion(
                    username,
                );


            res.cookie(
                COOKIE_NAME,
                token,
                {
                    httpOnly: true,

                    secure:
                        process.env
                            .NODE_ENV ===
                        'production',

                    sameSite: 'strict',

                    maxAge:
                        SESSION_DURATION,

                    path: '/',
                },
            );


            return res.redirect(
                '/api/docs',
            );
        },
    );

    server.get(
        '/api/docs/session',
        noCache,
        (
            req: Request,
            res: Response,
        ) => {
            const token =
                req.cookies?.[
                    COOKIE_NAME
                ];

            if (
                !verificarTokenSesion(
                    token,
                )
            ) {
                return res
                    .status(401)
                    .json({
                        authenticated: false,
                    });
            }

            return res
                .status(200)
                .json({
                    authenticated: true,
                });
        },
    );

    // ============================================
    // LOGOUT
    // ============================================

    server.get(
        '/api/docs/logout',
        (
            req: Request,
            res: Response,
        ) => {

            res.clearCookie(
                COOKIE_NAME,
                {
                    path: '/',
                },
            );

            return res.redirect(
                '/api/docs/login',
            );
        },
    );


    // ============================================
    // MIDDLEWARE DE PROTECCIÓN
    // ============================================

    const protegerSwagger = (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {

        const token =
            req.cookies?.[
                COOKIE_NAME
            ];

        if (
            verificarTokenSesion(
                token,
            )
        ) {
            return next();
        }

        return res.redirect(
            '/api/docs/login',
        );
    };


    app.use(
        '/api/docs-json',
        protegerSwagger,
    );

    app.use(
        '/api/docs',
        protegerSwagger,
    );
}