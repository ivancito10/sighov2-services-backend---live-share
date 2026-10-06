import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  // Reservadas para reactivar roles; actualmente no se usan en fisioterapeutas.
  FISIOTERAPIA_USER_MODEL_TYPE: Joi.string().optional(),
  FISIOTERAPIA_ROLE_GUARD: Joi.string().optional(),
  FISIOTERAPEUTAS_EMAIL_DOMAIN: Joi.string().hostname().default('ssulapaz.org'),
  FISIOTERAPEUTAS_MUNICIPIO_NACIMIENTO: Joi.number().integer().min(1).max(2147483647).default(69),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().pattern(/^[1-9]\d*(s|m|h|d)$/).default('8h'),

  DB_SIGHOV_HOST: Joi.string().required(),
  DB_SIGHOV_PORT: Joi.number().default(5432),
  DB_SIGHOV_USERNAME: Joi.string().required(),
  DB_SIGHOV_PASSWORD: Joi.string().required(),
  DB_SIGHOV_DATABASE: Joi.string().required(),

  DB_ETAPA2_HOST: Joi.string().required(),
  DB_ETAPA2_PORT: Joi.number().default(5432),
  DB_ETAPA2_USERNAME: Joi.string().required(),
  DB_ETAPA2_PASSWORD: Joi.string().required(),
  DB_ETAPA2_DATABASE: Joi.string().required(),
});
