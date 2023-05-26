# `default` Plugin

The `default` plugin provides the core functionality of the application, and allows you to define projects, or extend project configuration from projects auto-discovered by other plugins.

## Configuration

To define a project, create a file which matches the pattern `.{project,module}.{json,yaml,yml}`.

The schema of this file is as below. All fields are optional unless otherwise specified.

```yaml
extends: string # Path to a project definition extension  relative to this file
name: string # Name of this project (default: name of directory)
dependencies: [ string ] # List of files/directories this project depends on outside of this directory
tags: [ string ] # Tags for this project

commands: # Dictionary of custom commands relevant to this project
  commandName: # Name of command
    # The following object can also be passed as an array in order to execute multiple commands
    name: string # Display name of the command
    command: string # Command to run (File executable or shell command) (required)
    arguments: [ string ] # Arguments to pass to the command
    shell: string | boolean # Run the command in a specific or default shell. E.g. 'Powershell.exe', '/bin/bash' (default: true, runs in OS default shell)
    workingDirectory: string # Directory to run this command from (default: Current directory)

    condition: string # Condition expression evaluated before command runs
    conditionBehaviour: 'skip' | 'fail' # How the command behaves if the condition evaluates to false (default: 'skip')
    failureBehavor: 'fail' | 'skip' # How the command behaves if the process fails (default: 'fail')
```

> Note the `command`, and `argument` strings can contain template expressions see [documentation](../index.md#templating-and-expressions) for more information.

### Example

```yaml
name: MyProject
dependencies:
  - ../ProjectDependency # Note that this is relative to the file directory
  - ../fileDependency.config
tags:
  - team:a-team
  - service:my-project

commands:
  build:
    - name: restore packages
      command: npm install
    - name: build
      command: "npm run build -- ${{env.PRODUCTION ? '--prod' : ''}}" # Contents of `${{}}` is evaluated as a javascript expression
  test:
    command: npm run test
    condition: env.RUN_TESTS_FOR.split(',').includes(name) # Javascript expression
```

## Extensions

Extensions are files can be used to store shared project configuration in a central location.

Using `extends` property of your project you can reference the relative path of an extension file.
This will merge the content of the extension with your project file.

Note that `extends` can also be used in extension files.

| field                    | behaviour |
| ------------------------ | --------- |
| `dependencies`           | merge     |
| `tags`                   | merge     |
| `commands.{commandName}` | replace   |


### Example

```yaml
## .npm.project-ex.yml
tags:
  - lang:typescript

commands:
  build:
    - name: restore packages
      command: npm install
    - name: build
      command: npm run build


## src/project1/.project.yml
extends: ../../.npm.project-ex.yml
# Adds `lang:typescript` tag & `build` command
```
