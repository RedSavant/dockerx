import type { EnvVar, PortMapping, VolumeMapping } from '../types/run-options.js';

export type RestartPolicy = 'no' | 'always' | 'on-failure';

export interface ServiceOptions {
  image: string;
  name?: string;
  ports: PortMapping[];
  volumes: VolumeMapping[];
  envVars: EnvVar[];
  interactive: boolean;
  command?: string;
  dependsOn: string[];
  restart?: RestartPolicy;
  workingDir?: string;
}

export interface ComposeProject {
  services: ServiceOptions[];
}