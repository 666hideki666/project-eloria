#!/bin/bash

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
RUNTIME_DIR="$PROJECT_ROOT/.project-eloria-runtime"
PID_FILE="$RUNTIME_DIR/dev-server.pid"
ROOT_FILE="$RUNTIME_DIR/dev-server.root"
LOCK_DIR="$RUNTIME_DIR/launcher.lock"
LOCK_OWNER="$LOCK_DIR/pid"
LOCK_HELD=0
DESCENDANT_PIDS=""

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

pause_if_interactive() {
  if [ -t 0 ]; then
    printf "\nEnterキーを押すと、このターミナルウインドウを閉じます。"
    IFS= read -r _
  fi
}

release_lock() {
  if [ "$LOCK_HELD" -eq 1 ]; then
    rm -f "$LOCK_OWNER"
    rmdir "$LOCK_DIR" 2>/dev/null || true
    LOCK_HELD=0
  fi
}

cleanup_state() {
  rm -f "$PID_FILE" "$ROOT_FILE"
}

finish() {
  printf "%s\n" "$1"
  release_lock
  pause_if_interactive
  exit 0
}

fail() {
  printf "エラー: %s\n" "$1"
  release_lock
  pause_if_interactive
  exit 1
}

acquire_lock() {
  local attempt owner
  attempt=0
  while [ "$attempt" -lt 100 ]; do
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      printf "%s\n" "$$" > "$LOCK_OWNER"
      LOCK_HELD=1
      return 0
    fi

    owner=""
    if [ -f "$LOCK_OWNER" ]; then
      owner="$(sed -n '1p' "$LOCK_OWNER" 2>/dev/null || true)"
    fi
    case "$owner" in
      ''|*[!0-9]*)
        rm -f "$LOCK_OWNER"
        rmdir "$LOCK_DIR" 2>/dev/null || true
        ;;
      *)
        if ! kill -0 "$owner" 2>/dev/null; then
          rm -f "$LOCK_OWNER"
          rmdir "$LOCK_DIR" 2>/dev/null || true
        fi
        ;;
    esac
    sleep 0.1
    attempt=$((attempt + 1))
  done
  return 1
}

process_cwd() {
  /usr/sbin/lsof -a -p "$1" -d cwd -Fn 2>/dev/null |
    sed -n 's/^n//p' |
    sed -n '1p'
}

is_managed_pid() {
  local pid command_text cwd_text root_text
  pid="$1"
  case "$pid" in
    ''|*[!0-9]*) return 1 ;;
  esac
  kill -0 "$pid" 2>/dev/null || return 1
  [ -f "$ROOT_FILE" ] || return 1
  root_text="$(sed -n '1p' "$ROOT_FILE" 2>/dev/null || true)"
  [ "$root_text" = "$PROJECT_ROOT" ] || return 1
  command_text="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  case "$command_text" in
    *"npm run dev"*) ;;
    *) return 1 ;;
  esac
  cwd_text="$(process_cwd "$pid")"
  [ "$cwd_text" = "$PROJECT_ROOT" ]
}

collect_descendants() {
  local parent child children
  parent="$1"
  children="$(/usr/bin/pgrep -P "$parent" 2>/dev/null || true)"
  for child in $children; do
    collect_descendants "$child"
    DESCENDANT_PIDS="$DESCENDANT_PIDS $child"
  done
}

tracked_processes_alive() {
  local pid
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    return 0
  fi
  for pid in $DESCENDANT_PIDS; do
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  done
  return 1
}

mkdir -p "$RUNTIME_DIR" || {
  printf "エラー: 起動状態フォルダを確認できませんでした。\n"
  pause_if_interactive
  exit 1
}

trap 'release_lock' EXIT INT TERM

if ! acquire_lock; then
  fail "別の起動・停止処理が進行中です。少し待ってからもう一度お試しください。"
fi

if [ ! -f "$PID_FILE" ]; then
  cleanup_state
  finish "Project Eloriaはすでに停止しています。"
fi

SERVER_PID="$(sed -n '1p' "$PID_FILE" 2>/dev/null || true)"
if ! is_managed_pid "$SERVER_PID"; then
  cleanup_state
  finish "古い起動情報を整理しました。Project Eloriaはすでに停止しています。"
fi

collect_descendants "$SERVER_PID"

# 保存PIDを起点に見つけた子プロセスだけを、深い階層から順に終了する。
for process_id in $DESCENDANT_PIDS; do
  if kill -0 "$process_id" 2>/dev/null; then
    kill "$process_id" 2>/dev/null || true
  fi
done
kill "$SERVER_PID" 2>/dev/null || true

attempt=0
while [ "$attempt" -lt 50 ]; do
  if ! tracked_processes_alive; then
    cleanup_state
    finish "Project Eloriaの開発サーバーを停止しました。"
  fi
  sleep 0.1
  attempt=$((attempt + 1))
done

fail "サーバーを安全に停止できませんでした。PID $SERVER_PID は終了していません。"
