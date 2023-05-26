# build-champ

## Terminology

| Term       | Description                                                                |
| ---------- | -------------------------------------------------------------------------- |
| workspace  | The root directory, where `build-champ` is run from                        |
| project    | Directory containing library or application code/configuration             |
| command    | CLI command which performs an action on a project (e.g. build/test/deploy) |
| expression | Javascript expression which evaluates to a result                          |
| template   | Text which can contain replacement tokens wrapping expressions             |

## Install

TODO

## Plugins

Plugins extend the functionailty of `build-champ`.

### Features

- Automate discovery of projects
- Provide default commands for your projects
- Discover dependencies between your projects

### Configuration

`build-champ` by creating a file matching the pattern `{build-champ,workspace}.{json,yaml,yml}`

```yaml
plugins:
  pluginName: # Name of the plugin
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

- [default](./plugins/default.md) - Supports customized project configuration using `.project.yaml` files
- [dotnet](./plugins/dotnet.md) - Discovery of dotnet projects using `*.csproj`

### Custom Plugins

You can define custom plugins to cover your own requirements.

See examples from built-in plugins in `src/plugins` of this repository.

## Templating and expressions
