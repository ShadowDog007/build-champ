import { Project } from './Project';

export type ProjectMetadata = Partial<Omit<Project, 'dir'>>;
