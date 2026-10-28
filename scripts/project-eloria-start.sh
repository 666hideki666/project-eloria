#!/bin/bash

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
RUNTIME_DIR="$PROJECT_ROOT/.project-eloria-runtime"
PID_FILE="$RUNTIME_DIR/dev-server.pid"
ROOT_FILE="$RUNTIME_DIR/dev-server.root"
LOG_FILE="$RUNTIME_DIR/dev-server.log"
LOCK_DIR="$RUNTIME_DIR/launcher.lock"
LOCK_OWNER="$LOCK_DIR/pid"
GAME_URL="http://127.0.0.1:4173/"
PORT="4173"
LOCK_HELD=0

# Finderからの起動でも、一般的なmacOSのNode.js配置場所を探索できるようにする。
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

show_log_tail() {
  if [ -s "$LOG_FILE" ]; then
    printf "\nログの末尾:\n"
    tail -n 12 "$LOG_FILE"
  fi
}

fail() {
  printf "\nエラー: %s\n" "$1"
  printf "ログ: %s\n" "$LOG_FILE"
  show_log_tail
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

read_managed_pid() {
  if [ ! -f "$PID_FILE" ]; then
    return 1
  fi
  MANAGED_PID="$(sed -n '1p' "$PID_FILE" 2>/dev/null || true)"
  if is_managed_pid "$MANAGED_PID"; then
    return 0
  fi
  cleanup_state
  MANAGED_PID=""
  return 1
}

is_project_http_ready() {
  local page
  page="$(curl --silent --show-error --fail --max-time 1 "$GAME_URL" 2>/dev/null || true)"
  # 表示名だけが同じ別ページを開かないよう、ゲーム画面の要素も確認する。
  case "$page" in
    *"<title>ELORIA</title>"*) ;;
    *) return 1 ;;
  esac
  case "$page" in
    *'id="game-shell"'*) return 0 ;;
    *) return 1 ;;
  esac
}

is_port_in_use() {
  /usr/sbin/lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1
}

wait_until_ready() {
  local watched_pid attempt
  watched_pid="$1"
  attempt=0
  while [ "$attempt" -lt 120 ]; do
    if is_project_http_ready; then
      return 0
    fi
    if [ -n "$watched_pid" ] && ! kill -0 "$watched_pid" 2>/dev/null; then
      return 2
    fi
    sleep 0.25
    attempt=$((attempt + 1))
  done
  return 1
}

open_game() {
  if ! /usr/bin/open "$GAME_URL"; then
    fail "ブラウザを開けませんでした。URLを手動で開いてください: $GAME_URL"
  fi
  printf "ブラウザを開きました: %s\n" "$GAME_URL"
  printf "終了するには「Project Eloriaを停止.command」をダブルクリックしてください。\n"
  release_lock
  pause_if_interactive
  exit 0
}

mkdir -p "$RUNTIME_DIR" || {
  printf "エラー: 起動状態を保存するフォルダを作成できませんでした。\n"
  pause_if_interactive
  exit 1
}
touch "$LOG_FILE" 2>/dev/null || {
  printf "エラー: ログファイルを作成できませんでした: %s\n" "$LOG_FILE"
  pause_if_interactive
  exit 1
}

trap 'release_lock' EXIT INT TERM

if ! acquire_lock; then
  fail "別の起動・停止処理が進行中です。少し待ってからもう一度お試しください。"
fi

printf "Project Eloriaを準備中です。\n"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  fail "Node.jsが必要です。Node.jsをインストールしてから、もう一度お試しください。"
fi

cd "$PROJECT_ROOT" || fail "プロジェクトフォルダへ移動できませんでした。"

MANAGED_PID=""
if read_managed_pid; then
  if is_project_http_ready; then
    printf "Project Eloriaのサーバーはすでに起動中です。\n"
    open_game
  fi

  printf "既存のサーバーが準備中です。応答を待っています。\n"
  wait_until_ready "$MANAGED_PID"
  WAIT_RESULT=$?
  if [ "$WAIT_RESULT" -eq 0 ]; then
    open_game
  fi
  if [ "$WAIT_RESULT" -eq 2 ]; then
    cleanup_state
    fail "既存のサーバープロセスが起動途中で終了しました。"
  fi
  fail "既存のサーバーが30秒以内に応答しませんでした。"
fi

if is_project_http_ready; then
  printf "Project Eloriaのサーバーはすでに起動中です。\n"
  open_game
fi

if is_port_in_use; then
  fail "ポート4173は別のアプリが使用中です。そのアプリを終了してから再度お試しください。"
fi

if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  printf "初回準備として必要なファイルをインストールしています。\n"
  printf "\n[%s] npm install\n" "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
  if ! npm install >> "$LOG_FILE" 2>&1; then
    fail "必要なファイルのインストールに失敗しました。"
  fi
fi

# npm install中に別のアプリがポートを使用し始める場合も考慮する。
if is_project_http_ready; then
  printf "Project Eloriaのサーバーはすでに起動中です。\n"
  open_game
fi
if is_port_in_use; then
  fail "ポート4173は別のアプリが使用中です。そのアプリを終了してから再度お試しください。"
fi

printf "サーバー起動中です。\n"
printf "\n[%s] npm run dev\n" "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
nohup npm run dev >> "$LOG_FILE" 2>&1 </dev/null &
SERVER_PID=$!

printf "%s\n" "$SERVER_PID" > "$PID_FILE.tmp"
mv "$PID_FILE.tmp" "$PID_FILE"
printf "%s\n" "$PROJECT_ROOT" > "$ROOT_FILE.tmp"
mv "$ROOT_FILE.tmp" "$ROOT_FILE"

wait_until_ready "$SERVER_PID"
WAIT_RESULT=$?
if [ "$WAIT_RESULT" -eq 0 ]; then
  open_game
fi
if [ "$WAIT_RESULT" -eq 2 ]; then
  cleanup_state
  fail "開発サーバーが起動途中で終了しました。"
fi
fail "開発サーバーが30秒以内に応答しませんでした。停止ファイルで終了してから再度お試しください。"
