# install-all

Simple script designed to run the correct package install command in all folders that contain
a `package.json` recursively deep from the point the command is run

Born from the situation of having to set up a new development machine with over
30 different folders to run `npm install`. My motto is always "Work smarter, not
harder"

### Example

Imagine you've got the directory:

```
code
|--- project 1
|--- project 2
|   |--- server
|   |--- client
|--- project 3
```

Normally you'd have to go into each project folder and run `npm install`/`yarn install`/etc.
Now you can just run `install-all` in the code directory and the correct install will be run
for each subdirectory!

### Installation

Install this globally so you can run it wherever you need to.

##### npm
```bash
$ npm install -g install-all
```

##### pnpm
```bash
$ pnpm add -g install-all
```

##### yarn classic
```bash
$ yarn global add install-all
```

##### bun
```bash
$ bun install -g install-all
```

### Usage

Navigate to the top level folder and run the following:

```bash
$ install-all
```
