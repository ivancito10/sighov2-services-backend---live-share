import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),

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