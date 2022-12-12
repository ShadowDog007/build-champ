jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { ProjectCommandStatus } from '../../src/projects/ProjectCommandStatus';
import { TYPES } from '../../src/TYPES';
import { EvalServiceImpl } from '../../src/util/EvalService';
import { createContainer, MockProjectService } from '../mocks';
import { projectExamples } from '../project-examples';

describe('EvalService', () => {
  let container: Container;
  let evalService: EvalServiceImpl;
  let projectService: MockProjectService;

  beforeEach(() => {
    container = createContainer();

    container.rebind(TYPES.EvalService).to(EvalServiceImpl).inSingletonScope();
    container.rebind(TYPES.ProjectService).to(MockProjectService).inSingletonScope();

    evalService = container.get(TYPES.EvalService);
    projectService = container.get(TYPES.ProjectService);
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
    test('when prepareContext not called should throw error', () => {
      expect(
        () => evalService.safeEval('1+1')
      ).toThrowError('Must call .prepareContext() first');
    });

    test('should be able to eval simple arithmetic', async () => {
      await evalService.prepareContext();

      expect(evalService.safeEval('1 + 1')).toBe(2);
    });

    test('should be able to eval context os property', async () => {
      await evalService.prepareContext();

      expect(evalService.safeEval('os')).toBe(process.platform);
    });

    test('should be able to eval context projects property', async () => {
      await evalService.prepareContext();

      expect(evalService.safeEval('projects')).toEqual(evalService.context.projects);
    });

    test('should be able to eval context projects nested property', async () => {
      projectService.addProject(projectExamples.project1);
      await evalService.prepareContext();

      expect(evalService.safeEval('projects.Project1.dir')).toEqual(projectExamples.project1.dir);
    });

    test('should be able to eval project command status', async () => {
      await evalService.prepareContext();
      evalService.amendContext({
        status: {
          'Project1': ProjectCommandStatus.failed,
        }
      });

      expect(evalService.safeEval('status.Project1')).toBe(ProjectCommandStatus.failed);
    });
  });

  describe('.safeEvalTemplate()', () => {
    test('when prepareContext not called should throw error', () => {
      expect(
        () => evalService.safeEvalTemplate('${{1+1}}')
      ).toThrowError('Must call .prepareContext() first');
    });

    test('should be able to eval simple arithmetic', async () => {
      await evalService.prepareContext();

      expect(evalService.safeEvalTemplate('${{1 + 1}}')).toBe('2');
    });

    test('should be able to eval context os property', async () => {
      await evalService.prepareContext();

      expect(evalService.safeEvalTemplate('${{os}}')).toBe(process.platform);
    });

    test('should be able to eval context projects property', async () => {
      await evalService.prepareContext();

      expect(evalService.safeEvalTemplate('${{Object.keys(projects)}}')).toEqual(`${Object.keys(evalService.context.projects)}`);
    });

    test('should be able to eval context projects nested property', async () => {
      projectService.addProject(projectExamples.project1);
      await evalService.prepareContext();

      expect(evalService.safeEvalTemplate('${{projects.Project1.dir}}')).toEqual(projectExamples.project1.dir);
    });

    test('should be able to eval project command status', async () => {
      await evalService.prepareContext();
      evalService.amendContext({
        status: {
          'Project1': ProjectCommandStatus.failed,
        }
      });

      expect(evalService.safeEvalTemplate('${{status.Project1}}')).toBe(ProjectCommandStatus.failed);
    });

    test('should be able to eval multiple replacements', async () => {
      await evalService.prepareContext();

      expect(evalService.safeEvalTemplate('`${{1}} + ${{2}} = ${{1+2}}`')).toBe('`1 + 2 = 3`');
    });
  });
});
