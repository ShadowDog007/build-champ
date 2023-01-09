import { ContainerModule, interfaces } from 'inversify';
import { forEach, forIn } from 'lodash';
import 'reflect-metadata';
import { commands } from './cli';
import { ProviderTypes, Provider } from './providers';
import { providerTypeMappings } from './providers/providerTypeMappings';
import { ServiceTypes } from './services';
import { serviceTypeMapping } from './services/serviceTypeMapping';
import { TYPES } from './TYPES';

export const containerModule = new ContainerModule(bind => {
  forEach(commands, v => bind(TYPES.Command).to(v).inSingletonScope());

  forIn(ProviderTypes, (t, k) =>
    bind(t as interfaces.ServiceIdentifier<Provider<unknown>>)
      .to(providerTypeMappings[k as keyof typeof ProviderTypes])
      .inSingletonScope()
  );
  forIn(ServiceTypes, (t, k) => bind(t).to(serviceTypeMapping[k as keyof typeof ServiceTypes]).inSingletonScope());
});
