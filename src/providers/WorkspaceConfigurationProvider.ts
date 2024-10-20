import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { Provider } from '.';
import { WorkspaceConfiguration } from '../config/WorkspaceConfiguration';
import { ServiceTypes } from '../services';
import { FileService } from '../services/FileService';
import { GlobService } from '../services/GlobService';

@injectable()
export class WorkspaceConfigurationProvider extends Provider<WorkspaceConfiguration> {

  constructor(
    @inject(ServiceTypes.FileService) private readonly fileService: FileService,
    @inject(ServiceTypes.GlobService) private readonly globService: GlobService,
  ) {
    super();
  }

  async provider(): Promise<WorkspaceConfiguration> {
    const configFiles = this.globService.glob('.{build-champ,workspace}.{json,yaml,yml}');

    let config: WorkspaceConfiguration | undefined;
    for await (const configFile of configFiles) {
      config = await this.fileService.readFileYaml(configFile);
    }

    // TODO - Validate config

    return {
      sources: ['**/*'],
      ...config,
      plugins: {
        default: {},
        dotnet: {},
        ...config?.plugins,
      }
    };
  }
}
