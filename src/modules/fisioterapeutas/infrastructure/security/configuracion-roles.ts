import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
export function configuracionRoles(config: ConfigService) {
    const modelType = config.get<string>('FISIOTERAPIA_USER_MODEL_TYPE');
    const guardName = config.get<string>('FISIOTERAPIA_ROLE_GUARD');
    if (!modelType || !guardName)
        throw new ServiceUnavailableException(
            'Configurar FISIOTERAPIA_USER_MODEL_TYPE y FISIOTERAPIA_ROLE_GUARD para comprobar roles',
        );
    return { modelType, guardName };
}
