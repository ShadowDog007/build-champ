jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { Context, ContextService } from '../../src/projects/ContextService';
import { ProjectCommandStatus } from '../../src/projects/ProjectCommandStatus';
import { TYPES } from '../../src/TYPES';
import { EvalServiceImpl } from '../../src/util/EvalService';
import { createContainer, MockProjectService } from '../mocks';
import { projectExamples } from '../project-examples';

describe('EvalService', () => {
  let container: Container;
  let evalService: EvalServiceImpl;
  let projectService: MockProjectService;
  let contextService: ContextService;

  beforeEach(async () => {
    container = createContainer();

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

      expect(evalService.safeEval('1 + 1', context)).toBe(2);
    });

    test('should be able to eval context os property', async () => {
      const context = await contextService.getContext();

      expect(evalService.safeEval('os', context)).toBe(process.platform);
    });

    test('should be able to eval context projects property', async () => {
      const context = await contextService.getContext();

      expect(evalService.safeEval('projects', context)).toEqual(context.projects);
    });

    test('should be able to eval context projects nested property', async () => {
      projectService.addProject(projectExamples.project1);
      const context = await contextService.getContext();

      expect(evalService.safeEval('projects.Project1.dir', context)).toEqual(projectExamples.project1.dir);
    });

    test('should be able to eval project command status', async () => {
      contextService.setProjectStatus(projectExamples.project1, ProjectCommandStatus.failed);
      const context = await contextService.getContext();

      expect(evalService.safeEval('status.Project1', context)).toBe(ProjectCommandStatus.failed);
    });
  });

  describe('.safeEvalTemplate()', () => {
    test('should be able to eval simple arithmetic', async () => {
      const context = await contextService.getContext();

      expect(evalService.safeEvalTemplate('${{1 + 1}}', context)).toBe('2');
    });

    test('should be able to eval context os property', async () => {
      const context = await contextService.getContext();

      expect(evalService.safeEvalTemplate('${{os}}', context)).toBe(process.platform);
    });

    test('should be able to eval context projects property', async () => {
      const context = await contextService.getContext();

      expect(evalService.safeEvalTemplate('${{Object.keys(projects)}}', context)).toEqual(`${Object.keys(context.projects)}`);
    });

    test('should be able to eval context projects nested property', async () => {
      projectService.addProject(projectExamples.project1);
      const context = await contextService.getContext();

      expect(evalService.safeEvalTemplate('${{projects.Project1.dir}}', context)).toEqual(projectExamples.project1.dir);
    });

    test('should be able to eval project command status', async () => {
      contextService.setProjectStatus(projectExamples.project1, ProjectCommandStatus.failed);
      const context = await contextService.getContext();

      expect(evalService.safeEvalTemplate('${{status.Project1}}', context)).toBe(ProjectCommandStatus.failed);
    });

    test('should be able to eval multiple replacements', async () => {
      const context = await contextService.getContext();

      expect(evalService.safeEvalTemplate('`${{1}} + ${{2}} = ${{1+2}}`', context)).toBe('`1 + 2 = 3`');
    });
  });
});
