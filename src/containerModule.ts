import { ContainerModule } from 'inversify';
import { forEach, forIn } from 'lodash';
import 'reflect-metadata';
import { commands } from './cli';
import { metadataLoaders, ProjectMetadataLoader } from './metadata';
import { processors, ProjectProcessor } from './processors';
import { ProviderTypes, ProviderValueTypes, ValueProvider } from './providers';
import { providerTypeMappings } from './providers/providerTypeMappings';
import { ServiceTypes } from './services';
import { serviceTypeMapping } from './services/serviceTypeMapping';
import { TYPES } from './TYPES';

export const containerModule = new ContainerModule(bind => {
  forEach(commands, v => bind(TYPES.Command).to(v).inSingletonScope());

  forIn(providerTypeMappings, (v, k) => bind(ProviderTypes[k as keyof typeof providerTypeMappings]).to(v).inSingletonScope());
  forIn(ProviderValueTypes, (v, k) => bind(v).toDynamicValue(c => c.container.get<ValueProvider<unknown>>(ProviderTypes[`${k as keyof typeof ProviderValueTypes}Provider`]).value));
  forIn(serviceTypeMapping, (v, k) => bind(ServiceTypes[k as keyof typeof serviceTypeMapping]).to(v).inSingletonScope());

  forEach(processors, v => bind<ProjectProcessor>(TYPES.ProjectProcessor).to(v).inSingletonScope());
  forEach(metadataLoaders, v => bind<ProjectMetadataLoader>(TYPES.ProjectMetadataHandler).to(v).inSingletonScope());
});
