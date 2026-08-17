export interface PortMapping {
  local: number;
  container: number;
}

export interface VolumeMapping {
  local: string;
  container: string;
}

export interface EnvVar {
  name: string;
  value: string;
}

export interface RunOptions {
  image: string;
  name?: string;
  ports: PortMapping[];
  volumes: VolumeMapping[];
  envVars: EnvVar[];
  interactive: boolean;
  detach: boolean;
  command?: string;
  rm: boolean;
}
