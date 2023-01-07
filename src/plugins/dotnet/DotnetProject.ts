import { Project } from '../../models/Project';
import { ProjectCommand } from '../../models/ProjectCommand';
import { DotnetTargets } from "./DotnetTargets";

export interface DotnetProject extends Project {
  commands: Partial<Record<DotnetTargets, ProjectCommand>>;
  tags: ['plugin:dotnet', ...Project['tags']];
}