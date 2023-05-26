# build-champ

Flexible tool for managing a group of projects within a single mono-repo.

## Features

- Automated dependency discovery (by language/project type)
- Differential builds/deployments
- Dependency management
- File templating
- Language Dependency Detection
  - dotnet

See [documentation here](./docs/index.md)

### Example

---

```yaml
name: MyProject
dependencies:
  - ../ProjectDependency
  - ../fileDependency.config
tags:
  - my-project

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
