#!/bin/bash
deno run "$@" --allow-env --allow-read --allow-net --allow-write ./src/registerCommands.ts 