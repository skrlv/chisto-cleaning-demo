#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "${0:A:h}" || exit 1
node scripts/preview.mjs start
if [[ $? -ne 0 ]]; then
  printf '\nНажмите Enter, чтобы закрыть окно.\n'
  read
  exit 1
fi
