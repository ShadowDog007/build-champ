# `dotnet` Plugin

The `dotnet` plugin provides support for auto-discovery of dotnet projects.

## Project Discovery
---
This plugin scans for project files matching `*.csproj`

This plugin is also aware of `Directory.build.props` and `Directory.package.props` files, and will take into account this configuration when determining dependencies and commands.

Default name for projects loaded by this plugin will match the dotnet project name.

### Dependencies
---
Dependencies specified by the `*.csproj` file are included as dependecies of the project. Transitive dependencies are included too (i.e. dependencies of a projects dependencies) regardless of if they are loaded as projects or not.

### Tags
---
All projects loaded by this plugin include the tag `plugin:dotnet`.

Projects using the new SDK style format will also include the tag `dotnet-sdk:${projectSdk}` where `projectSdk` is the value in `<Project Sdk="projectSdk" >`

### Commands
---
This plugin includes the following commands, which can be configured using environment variables

| Command | Condition                                                     | SDK Style Project | Legacy Style Project           |
| ------- | ------------------------------------------------------------- | ----------------- | ------------------------------ |
| restore | -                                                             | `dotnet restore`  | `msbuild ${csproj} -t:restore` |
| build   | -                                                             | `dotnet build`    | `msbuild ${csproj} -t:build`   |
| test    | When `Microsoft.NET.Test.Sdk` package is referenced           | `dotnet test`     | -                              |
| package | When project doesn't specify `<IsPackable>false</IsPackable>` | `dotnet pack`     | -                              |
| publish | -                                                             | `dotnet publish`  | `msbuild ${csproj} -t:publish` |

| Environment Variable   | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| `DOTNET_CONFIGURATION` | Sets the configuration for all commands (defaults to `Release`)           |
| `DOTNET_BUILD_ARGS`    | Additional arguments to pass to `build`/`test`/`pack`/`publish` commands. |
| `DOTNET_TEST_ARGS`     | Additional arguments to pass to `test` command.                           |
| `DOTNET_PACK_ARGS`     | Additional arguments to pass to `pack` command.                           |
| `DOTNET_PUBLISH_ARGS`  | Additional arguments to pass to `publish` command.                        |
