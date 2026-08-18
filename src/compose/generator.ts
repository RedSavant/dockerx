import type { ComposeProject, ServiceOptions } from './types.js';

export function generateComposeYaml(project: ComposeProject): string {
  const lines: string[] = ['services:'];

  for (const service of project.services) {
    lines.push(`  ${serviceName(service)}:`);
    lines.push(`    image: ${service.image}`);
    if (service.name) {
      lines.push(`    container_name: ${service.name}`);
    }
    if (service.ports.length > 0) {
      lines.push('    ports:');
      for (const port of service.ports) {
        lines.push(`      - "${port.local}:${port.container}"`);
      }
    }
    if (service.volumes.length > 0) {
      lines.push('    volumes:');
      for (const volume of service.volumes) {
        lines.push(`      - ${formatVolume(volume.local, volume.container)}`);
      }
    }
    if (service.envVars.length > 0) {
      lines.push('    environment:');
      for (const envVar of service.envVars) {
        lines.push(`      ${envVar.name}: ${quoteIfNeeded(envVar.value)}`);
      }
    }
    if (service.interactive) {
      lines.push('    stdin_open: true');
      lines.push('    tty: true');
    }
    if (service.command) {
      lines.push(`    command: ${service.command}`);
    }
    if (service.dependsOn.length > 0) {
      lines.push('    depends_on:');
      for (const dependency of service.dependsOn) {
        lines.push(`      - ${dependency}`);
      }
    }
    if (service.restart) {
      lines.push(`    restart: ${service.restart}`);
    }
    if (service.workingDir) {
      lines.push(`    working_dir: ${service.workingDir}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function serviceName(service: ServiceOptions): string {
  return service.name?.trim() || service.image.split('/').pop()?.split(':')[0] || 'service';
}

function formatVolume(local: string, container: string): string {
  const localQuoted = /[\s:]/.test(local) ? quote(local) : local;
  return `${localQuoted}:${container}`;
}

function quoteIfNeeded(value: string): string {
  if (/^[0-9]+$/.test(value)) {
    return `"${value}"`;
  }
  if (/[\s#:,{}[\]]/.test(value) || value === '') {
    return quote(value);
  }
  return value;
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}