jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { ProjectCommandStatus } from '../../src/models/ProjectCommandStatus';
import { ContextService } from '../../src/services/ContextService';
import { EvalServiceImpl } from '../../src/services/EvalService';
import { TYPES } from '../../src/TYPES';
import { createContainer, MockProjectService, resetFs } from '../mocks';
import { projectExamples } from '../project-examples';

describe('EvalService', () => {
  let container: Container;
  let evalService: EvalServiceImpl;
  let projectService: MockProjectService;
  let contextService: ContextService;

  beforeEach(async () => {
    await resetFs();
    container = await createContainer();

    container.rebind(TYPES.EvalService).to(EvalServiceImpl).inSingletonScope();
    container.rebind(TYPES.ProjectService).to(MockProjectService).inSingletonScope();

    evalService = container.get(TYPES.EvalService);
    projectService = container.get(TYPES.ProjectService);
    contextService = container.get(TYPES.ContextService);
  });

  test('should be resolvable and singleton', () => {
    // Given
    container.restore(); // Reset to clear above mock setup
    container.rebind(TYPES.ProjectService).to(MockProjectService).inSingletonScope();

    // When
    const registeredInstance = container.get(TYPES.EvalService);

    // Verify
    expect(registeredInstance).toBeInstanceOf(EvalServiceImpl);
    expect(container.get(TYPES.EvalService)).toBe(registeredInstance);
  });

  describe('.safeEval()', () => {
    test('should be able to eval simple arithmetic', async () => {
      const context = await contextService.getContext();

      expect(await evalService.safeEvalAsync('1 + 1', context)).toBe(2);
    });

    test('should be able to eval context os property', async () => {
      const context = await contextService.getContext();

      expect(await evalService.safeEvalAsync('os', context)).toBe(process.platform);
    });

    test('should be able to eval context projects property', async () => {
      const context = await contextService.getContext();

      expect(await evalService.safeEvalAsync('projects', context)).toEqual(context.projects);
    });

    test('should be able to eval context projects nested property', async () => {
      projectService.addProject(projectExamples.project1);
      const context = await contextService.getContext();

      expect(await evalService.safeEvalAsync('projects.Project1.dir', context)).toEqual(projectExamples.project1.dir);
    });

    test('should be able to eval project command status', async () => {
      contextService.setProjectStatus(projectExamples.project1, ProjectCommandStatus.failed);
      const context = await contextService.getContext();

      expect(await evalService.safeEvalAsync('status.Project1', context)).toBe(ProjectCommandStatus.failed);
    });
  });

  describe('.safeEvalTemplate()', () => {
    test('should be able to eval simple arithmetic', async () => {
      const context = await contextService.getContext();

      expect(await evalService.safeEvalTemplateAsync('${{1 + 1}}', context)).toBe('2');
    });

    test('should be able to eval context os property', async () => {
      const context = await contextService.getContext();

      expect(await evalService.safeEvalTemplateAsync('${{os}}', context)).toBe(process.platform);
    });

    test('should be able to eval context projects property', async () => {
      const context = await contextService.getContext();

      expect(await evalService.safeEvalTemplateAsync('${{Object.keys(projects)}}', context)).toEqual(`${Object.keys(context.projects)}`);
    });

    test('should be able to eval context projects nested property', async () => {
      projectService.addProject(projectExamples.project1);
      const context = await contextService.getContext();

      expect(await evalService.safeEvalTemplateAsync('${{projects.Project1.dir}}', context)).toEqual(projectExamples.project1.dir);
    });

    test('should be able to eval project command status', async () => {
      contextService.setProjectStatus(projectExamples.project1, ProjectCommandStatus.failed);
      const context = await contextService.getContext();

      expect(await evalService.safeEvalTemplateAsync('${{status.Project1}}', context)).toBe(ProjectCommandStatus.failed);
    });

    test('should be able to eval multiple replacements', async () => {
      const context = await contextService.getContext();

      expect(await evalService.safeEvalTemplateAsync('`${{1}} + ${{2}} = ${{1+2}}`', context)).toBe('`1 + 2 = 3`');
    });
  });
});
