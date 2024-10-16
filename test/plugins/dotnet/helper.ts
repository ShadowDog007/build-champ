import { mapValues } from 'lodash';
import { fs } from 'memfs';
import { dirname, join } from 'path';
import { js2xml } from 'xml-js';
import { DotnetSdkProjectFile } from '../../../src/plugins/dotnet/DotnetService';
import { baseDir } from '../../mocks';

export function addCsproj(name: string, projectBaseDir: string, { dependencies, testProject, properties }: {
  dependencies?: string[],
  testProject?: boolean,
  properties?: Record<string, string>,
} = {}): [string, DotnetSdkProjectFile] {
  const filePath = join(projectBaseDir, name, `${name}.csproj`);
  const content: DotnetSdkProjectFile = {
    Project: {
      _attributes: {
        Sdk: 'Microsoft.NET.Sdk'
      },
      PropertyGroup: [{
        ...mapValues(properties, v => ({ _text: v })),
      }],
      ItemGroup: [{
        PackageReference: testProject ? [
          {
            _attributes: {
              Include: 'Microsoft.NET.Test.Sdk'
            }
          }] : [],
        ProjectReference: dependencies?.map(dep => ({
          _attributes: {
            Include: `../${dep}/${dep}.csproj`,
          }
        }))
      }]
    }
  };

  saveCsproj(filePath, content);
  return [filePath.replaceAll('\\', '/'), content];
}

export function saveCsproj(filePath: string, content: DotnetSdkProjectFile) {
  const fullDir = join(baseDir, filePath);
  fs.mkdirSync(dirname(fullDir), { recursive: true });
  fs.writeFileSync(fullDir, js2xml(content, { compact: true }));
}