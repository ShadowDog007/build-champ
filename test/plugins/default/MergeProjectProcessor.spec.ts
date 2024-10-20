import { Container } from 'inversify';
import 'reflect-metadata';
import { MergeProjectProcessor } from '../../../src/plugins/default/MergeProjectProcessor';
import { createContainer } from '../../mocks';
import { projectExamples } from '../../project-examples';
import { Project } from '../../../src/models/Project';

describe(MergeProjectProcessor, () => {
  let container: Container;
  let processor: MergeProjectProcessor;

  beforeEach(async () => {
    container = await createContainer();
    processor = container.resolve(MergeProjectProcessor);
  });

  describe(MergeProjectProcessor.prototype.processBatch, () => {
    test('should not merge projects with miss-matching dirs', async () => {
      // Given
      const projects = [projectExamples.project1, projectExamples.project2];

      // When
      const result = await processor.processBatch(projects);

      // Verify
      expect(result).toMatchObject(projects);
    });

    test('should take properties from preceding project if there is a match', async () => {
      // Given
      const projects = [
        { ...projectExamples.project1, extends: '../.base.project.yml' },
        { ...projectExamples.project2, dir: projectExamples.project1.dir }
      ];

      // When
      const result = await processor.processBatch(projects);

      // Verify
      expect(result).toMatchObject([{
        extends: '../.base.project.yml',
        name: projectExamples.project1.name,
        commands: projectExamples.project1.commands,
        dir: projectExamples.project1.dir,
        dependencies: [...projectExamples.project1.dependencies, ...projectExamples.project2.dependencies],
        tags: [...projectExamples.project1.tags, ...projectExamples.project2.tags]
      } satisfies Project]);
    });



    test('should take properties from proceeding project if there is a match', async () => {
      // Given
      const projects = [
        { ...projectExamples.project1, extends: undefined, name: undefined, commands: undefined } as unknown as Project,
        { ...projectExamples.project2, extends: '../.base.project.yml', dir: projectExamples.project1.dir }
      ];

      // When
      const result = await processor.processBatch(projects);

      // Verify
      expect(result).toMatchObject([{
        extends: '../.base.project.yml',
        name: projectExamples.project2.name,
        commands: projectExamples.project2.commands,
        dir: projectExamples.project1.dir,
        dependencies: [...projectExamples.project1.dependencies, ...projectExamples.project2.dependencies],
        tags: [...projectExamples.project1.tags, ...projectExamples.project2.tags]
      } satisfies Project]);
    });
  });

});