# DockerX

Interactive command-line assistant that simplifies using Docker.

Instead of memorizing `docker run` options, answer a few questions and DockerX
builds the command for you: it displays it, asks for confirmation, then runs it.

```bash
dockerx run
```

## Installation

Prerequisites:

- Node.js 22 or newer
- Docker (`docker` CLI available in the PATH)

Docker commands need access to the Docker daemon. If your user is not in the
`docker` group, run DockerX with `sudo` — some operations (network management,
pull, run) will fail with a permission error otherwise.

From the repository:

```bash
npm install
npm run build
npm link
```

The `dockerx` command is then available globally.

## Interactive menu

```bash
dockerx open
```

Opens a full-screen menu in the terminal. Navigate with the arrow keys or
Tab, press Enter to select, Esc to go back:

- **Pull an image** — lists the first official images from the Docker Hub API.
  Type to search (results update as you type), select an image and press Enter
  to `docker pull` it.
- **Run** — build a `docker run` command yourself: toggle the options you want
  (Image, name, ports, volumes, environment variables, `-it`, `--detach`,
  `--rm`, command) with Space, then confirm to run.
- **Network** — list, create, remove and inspect Docker networks, choosing the
  driver (bridge, host, none, overlay, macvlan, ipvlan).
- **Exit** — leave the menu.

## Interactive usage

```bash
dockerx run
```

DockerX asks the following questions:

1. Which Docker image do you want to use? (default `node:22`)
2. Container name (optional)
3. Add one or more ports? (local port, container port)
4. Add volumes? (local path, path in the container)
5. Add environment variables? (name, value)
6. Interactive mode `-it`?
7. Detached mode `--detach`?
8. Command to run in the container (optional)
9. Add `--rm` automatically?

DockerX then displays a summary of the generated command and asks for
confirmation before running it. Answering "no" cancels without running anything.

## Non-interactive usage

Provide the image and options directly:

```bash
dockerx run node:22 --name my-app --port 3000:3000
```

In non-interactive mode, the command is displayed and executed immediately
(without confirmation), which makes it usable in scripts.

## Available options

| Option                       | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `--name <name>`              | Container name                                              |
| `--port <local:container>`   | Port mapping, repeatable                                    |
| `--volume <local:container>` | Volume mapping, repeatable                                  |
| `--env <KEY=value>`          | Environment variable, repeatable                            |
| `-d, --detach`               | Run in the background (detached mode)                       |
| `--no-rm`                    | Do not remove the container when it exits (disables `--rm`) |
| `--dry-run`                  | Print the generated command without running it              |
| `--help`                     | CLI help                                                    |
| `--version`                  | CLI version                                                 |

## Examples

With interactive confirmation:

```bash
dockerx run
```

Non-interactive, with multiple ports, volumes and variables:

```bash
dockerx run node:22 \
  --name my-app \
  --port 3000:3000 \
  --port 8080:80 \
  --volume ./project:/app \
  --env NODE_ENV=development \
  --env PORT=3000
```

Example of a generated command:

```bash
docker run --rm -it --name my-app -p 3000:3000 -v "/path/to/project:/app" -e NODE_ENV=development node:22
```

## How `--dry-run` works

```bash
dockerx run node:22 --port 3000:3000 --dry-run
```

Prints the generated command and exits without running or checking Docker.
Useful for previewing a command, especially in CI, before launching it.

## Network management

```bash
dockerx network ls
dockerx network create my-net --driver macvlan
dockerx network rm my-net
dockerx network inspect my-net
```

Supported drivers: `bridge` (default), `host`, `none`, `overlay`, `macvlan`,
`ipvlan`.

## Development commands

```bash
npm run dev      # run the CLI with tsx (no compilation)
npm run build    # compile TypeScript to dist/
npm start        # run the compiled CLI
npm test         # run the tests (vitest)
npm run lint     # ESLint
npm run format   # Prettier
```

## Security

- DockerX never runs Docker without confirmation in interactive mode.
- Arguments are never concatenated into a string executed by a shell: the Docker
  command is launched with an argument array via `child_process.spawn`, which
  prevents command injection.
- The command display applies shell escaping for readability only (safe
  copy-paste), never for execution.
- Docker's exit code is propagated, and `Ctrl+C` is forwarded to the Docker
  process for a clean shutdown.
- Docker is checked before execution: a clear error is shown if it is not
  available.

## Future improvements

- Attach a network to the run command (`--network`, `--network-alias`)
- Container management (`dockerx ps`, `dockerx stop`, `dockerx logs`)
- Image selection from locally available images
- Generating a `docker-compose.yml` from the answers
- `.env` file support
- Shell completion (bash, zsh)

## License

MIT — see the [LICENSE](./LICENSE) file.
