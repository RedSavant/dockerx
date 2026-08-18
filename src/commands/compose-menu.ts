import { confirm, input } from '@inquirer/prompts';
import { join } from 'node:path';
import { findComposeFile, readComposeFile, writeComposeFile } from '../compose/file.js';
import { generateComposeYaml, serviceName } from '../compose/generator.js';
import { parseComposeYaml } from '../compose/parser.js';
import type { ComposeProject, RestartPolicy, ServiceOptions } from '../compose/types.js';
import { promptEnvVars, promptPorts, promptVolumes } from '../prompts/run-prompts.js';
import { style } from '../tui/render.js';
import { pressAnyKey } from '../tui/press-any-key.js';
import { checklist } from '../tui/checklist.js';
import { select } from '../tui/select.js';
import {
  composeConfigCli,
  composeDownCli,
  composeLogsCli,
  composePsCli,
  composeUpCli,
  requireCompose,
} from './compose.js';

const RESTART_POLICIES: { value: RestartPolicy; label: string; hint: string }[] = [
  { value: 'no', label: 'No', hint: 'do not restart automatically (default)' },
  { value: 'always', label: 'Always', hint: 'always restart the container' },
  { value: 'on-failure', label: 'On failure', hint: 'restart only when the container exits with an error' },
];

export async function composeMenu(): Promise<void> {
  await requireCompose();

  const initialFile = findComposeFile(process.cwd());
  const project: ComposeProject = initialFile
    ? parseComposeYaml(readComposeFile(initialFile))
    : { services: [] };
  let file = initialFile;
  let rewriteApproved = initialFile === undefined;

  const choices = [
    { value: 'add', label: 'Add a service', hint: project.services.length > 0 ? `${project.services.length} service(s)` : 'no service yet' },
    { value: 'edit', label: 'Edit a service' },
    { value: 'remove', label: 'Remove a service' },
    { value: 'preview', label: 'Preview the compose file' },
    { value: 'up', label: 'Start the project', hint: 'docker compose up -d' },
    { value: 'down', label: 'Stop the project', hint: 'docker compose down' },
    { value: 'ps', label: 'Project status', hint: 'docker compose ps' },
    { value: 'logs', label: 'Logs', hint: 'docker compose logs -f' },
    { value: 'config', label: 'Validate the file', hint: 'docker compose config' },
    { value: 'back', label: 'Back' },
  ];

  while (true) {
    const choice = await select('Compose', choices);

    if (choice === 'add') {
      const service = await promptService(project);
      if (service) {
        project.services.push(service);
        await persist();
      }
    } else if (choice === 'edit') {
      const service = await pickService(project, 'Edit a service');
      if (!service) continue;
      const updated = await promptService(project, service);
      if (updated) {
        const index = project.services.indexOf(service);
        project.services[index] = updated;
        await persist();
      }
    } else if (choice === 'remove') {
      const service = await pickService(project, 'Remove a service');
      if (!service) continue;
      const proceed = await confirm({
        message: `Remove service "${serviceName(service)}"?`,
        default: false,
      });
      if (!proceed) continue;
      project.services = project.services.filter((candidate) => candidate !== service);
      await persist();
    } else if (choice === 'preview') {
      console.log(generateComposeYaml(project));
      await pressAnyKey();
    } else if (choice === 'up' || choice === 'down' || choice === 'ps' || choice === 'logs' || choice === 'config') {
      if (!file) {
        console.log(style.dim('Add a service first to create the compose file.'));
        continue;
      }
      if (choice === 'up') {
        const proceed = await confirm({ message: 'Start the project (docker compose up -d)?', default: true });
        if (!proceed) continue;
        await composeUpCli(file, true);
        await pressAnyKey('Press Enter to go back');
      } else if (choice === 'down') {
        const proceed = await confirm({ message: 'Stop the project (docker compose down)?', default: true });
        if (!proceed) continue;
        await composeDownCli(file);
        await pressAnyKey('Press Enter to go back');
      } else if (choice === 'ps') {
        await composePsCli(file);
        await pressAnyKey('Press Enter to go back');
      } else if (choice === 'logs') {
        await composeLogsCli(file);
      } else {
        await composeConfigCli(file);
        await pressAnyKey('Press Enter to go back');
      }
    } else {
      return;
    }
  }

  async function persist(): Promise<void> {
    if (project.services.length === 0 && !file) {
      console.log(style.dim('No service yet — nothing to save.'));
      return;
    }
    if (file && !rewriteApproved) {
      const proceed = await confirm({
        message:
          'compose.yaml already exists. Rewriting it may drop sections DockerX does not support (networks, volumes, ...). Continue?',
        default: false,
      });
      if (!proceed) {
        console.log(style.dim('Changes not saved.'));
        return;
      }
      rewriteApproved = true;
    }
    file ??= join(process.cwd(), 'compose.yaml');
    writeComposeFile(file, generateComposeYaml(project));
    console.log(style.green(`Saved ${file}`));
  }
}

async function pickService(
  project: ComposeProject,
  title: string,
): Promise<ServiceOptions | undefined> {
  if (project.services.length === 0) {
    console.log(style.dim('No service in the project yet.'));
    return undefined;
  }
  const choice = await select(
    title,
    project.services.map((service) => ({
      value: service,
      label: serviceName(service),
      hint: service.image,
    })),
  );
  return choice ?? undefined;
}

async function promptService(
  project: ComposeProject,
  initial?: ServiceOptions,
): Promise<ServiceOptions | undefined> {
  const existing = project.services.map((service) => serviceName(service));

  const selected = await checklist<string>('Configure the service', [
    { value: 'image', label: 'Image', hint: initial?.image ?? 'default node:22', toggled: initial === undefined || initial?.image !== undefined },
    { value: 'name', label: 'Container name', toggled: initial?.name !== undefined },
    { value: 'ports', label: 'Ports', hint: 'local:container', toggled: (initial?.ports.length ?? 0) > 0 },
    { value: 'volumes', label: 'Volumes', hint: 'local:container', toggled: (initial?.volumes.length ?? 0) > 0 },
    { value: 'env', label: 'Environment variables', hint: 'NAME=value', toggled: (initial?.envVars.length ?? 0) > 0 },
    { value: 'interactive', label: 'Interactive mode', hint: 'stdin_open + tty', toggled: initial?.interactive === true },
    { value: 'command', label: 'Command to run', toggled: initial?.command !== undefined },
    { value: 'depends', label: 'Depends on', hint: 'start after other services', toggled: (initial?.dependsOn.length ?? 0) > 0 },
    { value: 'restart', label: 'Restart policy', toggled: initial?.restart !== undefined },
    { value: 'workdir', label: 'Working directory', toggled: initial?.workingDir !== undefined },
    { value: 'save', label: 'Save the service', done: true },
  ]);
  if (!selected) {
    return undefined;
  }

  const want = new Set(selected);
  want.delete('save');

  const image = want.has('image') ? await askImage(initial?.image) : initial?.image ?? 'node:22';
  const name = want.has('name')
    ? await askOptional('Container name (optional):', initial?.name)
    : undefined;
  const ports = want.has('ports') ? await promptPorts() : [];
  const volumes = want.has('volumes') ? await promptVolumes() : [];
  const envVars = want.has('env') ? await promptEnvVars() : [];
  const interactive = want.has('interactive');
  const command = want.has('command')
    ? await askOptional('Command to run in the container (optional):', initial?.command)
    : undefined;
  const dependsOn = want.has('depends')
    ? await promptDependsOn(existing, initial?.name ?? image)
    : [];
  const restart = want.has('restart')
    ? await promptRestart(initial?.restart)
    : undefined;
  const workingDir = want.has('workdir')
    ? await askOptional('Working directory in the container (optional):', initial?.workingDir)
    : undefined;

  return { image, name, ports, volumes, envVars, interactive, command, dependsOn, restart, workingDir };
}

async function promptDependsOn(existing: string[], ownName: string): Promise<string[]> {
  const candidates = existing.filter((candidate) => candidate !== ownName);
  if (candidates.length === 0) {
    return [];
  }
  const picked = await checklist<string>(
    'Depends on (toggle the services to start before this one)',
    candidates.map((candidate) => ({ value: candidate, label: candidate })),
  );
  return picked ? [...picked] : [];
}

async function promptRestart(initial?: RestartPolicy): Promise<RestartPolicy | undefined> {
  const choice = await select(
    'Restart policy',
    RESTART_POLICIES.map((policy) => ({
      value: policy.value,
      label: policy.label,
      hint: policy.hint,
    })),
  );
  return choice ?? initial;
}

async function askImage(initialImage?: string): Promise<string> {
  const value = await input({
    message: 'Image:',
    default: initialImage ?? 'node:22',
    validate: (v) => (/^\S+$/.test(v.trim()) ? true : 'Invalid image: it must not contain spaces.'),
  });
  return value.trim();
}

async function askOptional(message: string, initialValue?: string): Promise<string | undefined> {
  const value = await input({
    message,
    ...(initialValue !== undefined ? { default: initialValue } : {}),
  });
  return value.trim() || undefined;
}