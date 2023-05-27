# build-champ

## Table of Contents

- [Terminology](#terminology)
- [Install](#install)
- [Plugins](#plugins)
  - [Features](#features)
  - [Configuration](#configuration)
  - [Built-In](#built-in)
  - [Custom Plugins](#custom-plugins)
- [Templating and Expressions](#templating-and-expressions)
- [CLI Commands](#cli-commands)
  - [Project Filtering Options](#project-filtering-options)
  - [`list` Command](#list-options)
  - [`run` Command](#run-options-command)
  - [`template` Command](#template-options)
  - [`init` Command](#init-options-projectdir)
- [Project Commands](#project-commands)

## Terminology

| Term       | Description                                                                |
| ---------- | -------------------------------------------------------------------------- |
| workspace  | The root directory, where `build-champ` is run from                        |
| project    | Directory containing library or application code/configuration             |
| command    | CLI command which performs an action on a project (e.g. build/test/deploy) |
| expression | Javascript expression which evaluates to a result                          |
| template   | Text which can contain replacement tokens wrapping expressions             |

## Install
---

You can use build-champ either via npx `npx build-champ`, or by installing it globaly `npm i -g build-champ`

## Plugins
---

Plugins extend the functionailty of `build-champ` and define how projects are discovered

### Features

- Automate discovery of projects
- Provide default commands for your projects
- Discover dependencies between your projects

### Configuration
---
You can configure your `build-champ` workspace by creating a file matching the pattern `.{build-champ,workspace}.{json,yaml,yml}`

```yaml
plugins:
  pluginName: # Name of the built-in plugin or path to custom plugin
    enabled: boolean # Set to false to disable default plugins
    targetDefaults:
      target:
    sourceTargetDefaults:

sources: [string] # Glob patterns to match projects to be loaded. Can use patterns prefixed with `!` to exclude projects`
```

Note:

- Plugins are loaded in the order that they are specified in the configuration.
- Plugins which provide project discovery have their project configuration merged if they are contained in the same directory.
  - Configuration from plugins specified earlier in your workspace config take precidence
- By default built-in plugins are loaded first, and in the same order they are specified below
  - You can reorder them by specifying them in your workspace config

### Built-In
---
- [default](./plugins/default.md) - Supports customized project configuration using `.project.yaml` files
- [dotnet](./plugins/dotnet.md) - Discovery of dotnet projects using `*.csproj`

### Custom Plugins
---
You can define custom plugins to cover your own requirements.

See examples from built-in plugins in `src/plugins` of this repository.

## Templating and expressions
---
Expressions can be used to customise your projects command behaviour or process dynamic replacements for configuration files.

Expressions are evaluated as javascript, so any valid javascript syntaxt is allowed. You are provided context variables which can be referenced for conditions or replacements.

### Templating
---

Templates can be used in `list`, and `template` CLI commands. And also in project commands for `command` and `arguments` properties.

Replacement expressions can be written using this format `${{ }}` (e.g. `1 + 1 == ${{1+1}}` (this would evaluate to the string `1 + 1 == 2`)).

The most powerfull use-case for templating is for application versioning.
For example, if you a configuration file used for deployment (e.g. CDK, K8's Pod config), you can use template replacements to fetch your projects version before deployment.

```yaml
# K8's Pod config
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: my-project
      image: my-project:${{projects['my-project'].version.hash}}
```

```typescript
// CDK application versions
export const projectVersions: {
  myProject1: "${{projects.MyProject1.version.hash}}";
  myProject2: "${{projects.MyProject2.version.hash}}";
};
```

### Expressions context variable schema

---

Context properties can be accessed in an expression by name.
For properties with special characters, you can use index notation.

e.g.

- `env.SOME_ENV_VAR`
- `projects.MyProject.version.hash`
- `projects['My.Project'].version.hash`

Project scoped expressions (Used in `list` & `run` commands) also have access to project properties.

e.g.

- `name`
- `dir`
- `version.hash`

```typescript
{
  /** Environment variables (case insensitive) */
  env: Record<string, string>;
  /** Current OS platform (See: https://nodejs.org/api/process.html#processplatform) */
  os: "aix" | "darwin" | "freebsd" | "linux" | "openbsd" | "sunos" | "win32";
  /**
   * Record of projects, keyed by their names (case insensitve).
   * All properties found in the `.project.yaml` are accessable.
   *
   * Included with each project are `dir` and `version` properties.
   */
  projects: Record<
    string,
    Project & {
      /** Directory of the project  */
      dir: string;
      /** Commit which changed either this project, or one of it's dependencies */
      version: {
        /** Commit hash */
        hash: string;
        /** Short commit hash (8 chars) */
        hashShort: string;
        /** Timestamp of when the commit was made */
        timestamp: Date;
      };
    }
  >;

  /**
   * Record of project command statuses, keyed by the project name (case insensitive).
   *
   * Only avaliable when using the `run` cli command.
   *
   * Values:
   * - 'skipped': The project does not have a matching command, or was skipped due to a condition or execution failure
   * - 'pending': The project has a matching command, but has not started execution yet
   * - 'running': The project command is currently running
   * - 'failed': Command failed due to a condition or execution failutre
   * - 'success': Command completed successfully
   */
  status: Record<
    string,
    "skipped" | "pending" | "running" | "failed" | "success"
  >;

  /**
   * Record of context values provided as CLI arguments.
   */
  context: Record<string, string>;
}
```

## CLI Commands
---

CLI can be invoked via npm using `npx build-champ`

### Project filtering options:

---

These options are common between `list`, and `run` commands

| Option                             | Description                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| -p, --project <projectPatterns...> | Filter only projects with matching names (supporting glob patterns)                       |
| -t, --tags <tags...>               | Filter only projects with provided tags                                                   |
| --changed-in \<objectIsh\>         | Filter only projects which were changed in a specific version                             |
| --changed-from \<objectIsh\>       | Filter only projects which were changed after specific version                            |
| --changed-to \<objectIsh\>         | Filter only projects which were changed before specific version (Use with --changed-from) |

### `list [options]`

---

Lists all projects within the current git repository

| Option                      | Description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| --long-version              | Show full version string                                                         |
| -t, --template \<template\> | Template string to customise how each project is printed using project variables |
| -j, --join \<join\>         | String to join project templates by (default: "\n")                              |

### `run [options] <command>`

---

Runs the specified command on all matching projects.

| Argument    | Description                    |
| ----------- | ------------------------------ |
| \<command\> | The name of the command to run |

| Option                           | Description                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| --continue-on-failure            | If set, all project commands will be run regardless of failures                                                     |
| --ignore-dependencies            | Run commands without waiting for dependencies                                                                       |
| --concurrency \<concurrency\>    | Number of projects to run concurrently (default: 1)                                                                 |
| -c, --context <contextValues...> | Context values to include for template evaluations passed as `-c key=value`, use in templates as `${{context.key}}` |

### `template [options]`

---

Parses a file and prints it after processing template replacements

| Option                           | Description                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| -f, --template-file \<filePath\> | File path of the template                                                                                          |
| -t, --template \<template\>      | Template text to use                                                                                               |
| -c, --context <contextValues...> | Context values to include for template evaluations passed as `-c key=value`, use in templates as `${{context.key}} |
| -e, --encoding \<encoding\>      | Encoding to use when parsing the file (default: "utf8")                                                            |

### `init [options] [projectDir]`

---

Initializes a directory with a default .project.yaml file

| Argument       | Description                                                 |
| -------------- | ----------------------------------------------------------- |
| \[projectDir\] | Directory to initalize (default: current working directory) |



## Project Commands
---

Project commands are defined in a collection keyed by command name, which can be referenced when running `npx build-champ run`.

Project commands can provide a single command as an object, or a list of commands which are run in sequence.

By default, your command run's in your OS's default shell. If your command requires a specific shell, you should specify it in the `shell` property, and also add a condition to skip execution on unsupported OS's.

During exeuction, your command is provided with additional environment variables which can be used by your command or the process it executes.

| Environment Variable       | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `REPOSITORY_DIR`           | The base directory of the running project                                  |
| `PROJECT_NAME`             | The name of the project                                                    |
| `PROJECT_DIR`              | The directory of the running project                                       |
| `PROJECT_VERSION`          | The hash of the last commit to change this project or it's dependencies    |
| `PROJECT_VERSION_SHORT`    | Same has PROJECT_VERSION, but only the first 8 characters                  |
| `CONTEXT_${key.toUpper()}` | Every context parameter passed via CLI arguments, prefixed with `CONTEXT_` |

You can also create `.env` and `.[commandName].env` files to specify additional environment variables to provide to your commands.

`.env` files are loaded from parent directories. More specific `.env` files can override the values of less specific files.
i.e. `.[commandName].env` files override `.env` files in the same directory, and files your project directory override any files in parent directories.

`.env` and `.[commandName].env` files also support variable expansion via `dotenv-expand`.
Variable expansion can reference any environment variable, including variables in the above table, or any variables defined in your `.env` files.
See examples of expansion [here](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env).