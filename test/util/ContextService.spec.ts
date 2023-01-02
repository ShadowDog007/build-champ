jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, writeFile } from 'fs/promises';
import { Container } from 'inversify';
import { join } from 'path';
import { TYPES } from '../../src/TYPES';
import { ContextServiceImpl } from '../../src/util/ContextService';
import { createContainer, MockProjectService, resetFs } from '../mocks';
import { projectExamples } from '../project-examples';

describe(ContextServiceImpl, () => {
  let container: Container;
  let contextService: ContextServiceImpl;
  let projectServce: MockProjectService;

  beforeEach(async () => {
    await resetFs();
    container = createContainer();

    container.rebind(TYPES.ProjectService).to(MockProjectService).inSingletonScope();

    contextService = container.get(TYPES.ContextService);
    projectServce = container.get(TYPES.ProjectService);

    projectServce.addProjects(...Object.values(projectExamples));

    await mkdir(join('/', projectExamples.project1.dir), { recursive: true });
  });

  describe('.env support', () => {
    const project = projectExamples.project1;

    test('when .env file exists should load environment variables', async () => {
      // Given
      await writeFile(join('/', project.dir, '.env'), 'DOTENV_VAR=from-dot-env');

      // When
      const context = await contextService.getProjectContext(project);

      // Verify
      expect(context.env.DOTENV_VAR).toBe('from-dot-env');
    });

    test('when .env file exists in parent directory should load environment variables', async () => {
      // Given
      await writeFile(join('/', project.dir, '..', '.env'), 'DOTENV_VAR=from-dot-env');

      // When
      const context = await contextService.getProjectContext(project);

      // Verify
      expect(context.env.DOTENV_VAR).toBe('from-dot-env');
    });

    test('when multiple .env files exist in parent directories should load environment variables', async () => {
      // Given
      await writeFile(join('/', project.dir, '..', '..', '.env'), 'DOTENV_VAR=from-base-dot-env\nDOTENV_BASE=from-base-dot-env');
      await writeFile(join('/', project.dir, '..', '.env'), 'DOTENV_VAR=from-dot-env');

      // When
      const context = await contextService.getProjectContext(project);

      // Verify
      expect(context.env.DOTENV_VAR).toBe('from-dot-env');
      expect(context.env.DOTENV_BASE).toBe('from-base-dot-env');
    });

    test('when multiple .env files for different scopes exist in the same directory should load environment variables', async () => {
      // Given
      await writeFile(join('/', project.dir, '.env'), 'DOTENV_VAR=from-global-scope\nDOTENV_GLOBAL=from-global-scope');
      await writeFile(join('/', project.dir, '.build.env'), 'DOTENV_VAR=from-build-scope\nDOTENV_BUILD=from-build-scope');
      await writeFile(join('/', project.dir, '.deploy.env'), 'DOTENV_VAR=from-deploy-scope');

      // When
      const context = await contextService.getProjectContext(project, 'build');

      // Verify
      expect(context.env.DOTENV_VAR).toBe('from-build-scope');
      expect(context.env.DOTENV_GLOBAL).toBe('from-global-scope');
      expect(context.env.DOTENV_BUILD).toBe('from-build-scope');
    });

    test('when expansion from parent .env file should expand correctly', async () => {
      // Given
      await writeFile(join('/', project.dir, '.env'), 'DOTENV_VAR=from-global-scope\nDOTENV_GLOBAL=from-global-env-var\nDOTENV_GLOBAL2=load-child-${DOTENV_BUILD}');
      await writeFile(join('/', project.dir, '.build.env'), 'DOTENV_VAR=${DOTENV_GLOBAL}\nDOTENV_BUILD=from-build-scope');

      // When
      const context = await contextService.getProjectContext(project, 'build');

      // Verify
      expect(context.env.DOTENV_VAR).toBe('from-global-env-var');
      expect(context.env.DOTENV_GLOBAL2).toBe('load-child-from-build-scope');
    });
  });
});
