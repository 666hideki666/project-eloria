#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
exec /bin/bash "$SCRIPT_DIR/scripts/project-eloria-stop.sh"
