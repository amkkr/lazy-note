#!/usr/bin/env bash
# 概要
#   Newsreader VF / JetBrains Mono VF の latin-ext subset woff2 と
#   それぞれの OFL ライセンスを public/fonts/ に配置するスクリプト。
#
# 参照
#   docs/rfc/editorial-citrus/03-typography.md
#   docs/rfc/editorial-citrus/08-roadmap.md (#0b)
#
# 配信元
#   フォント: jsDelivr 経由 @fontsource-variable/* (latin-ext subset 済み)
#   ライセンス: 各フォントの公式リポジトリ master ブランチ
#
# 用途
#   self-host 用の woff2 を取得 / 再取得する。
#   Phase 0 採点で採用案が確定したあとに本実装で @font-face を適用する。

set -euo pipefail

scriptDir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
projectRoot=$(cd "${scriptDir}/.." && pwd)
fontsDir="${projectRoot}/public/fonts"

mkdir -p "${fontsDir}"

# Newsreader VF (latin-ext subset, weight axis)
newsreaderRomanUrl="https://cdn.jsdelivr.net/npm/@fontsource-variable/newsreader@latest/files/newsreader-latin-ext-wght-normal.woff2"
newsreaderItalicUrl="https://cdn.jsdelivr.net/npm/@fontsource-variable/newsreader@latest/files/newsreader-latin-ext-wght-italic.woff2"

# JetBrains Mono VF (latin-ext subset, weight axis)
jetbrainsMonoUrl="https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono@latest/files/jetbrains-mono-latin-ext-wght-normal.woff2"

# OFL ライセンス
newsreaderLicenseUrl="https://raw.githubusercontent.com/productiontype/Newsreader/master/OFL.txt"
jetbrainsMonoLicenseUrl="https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt"

download() {
  local url="$1"
  local dest="$2"
  echo "  -> ${dest##*/}"
  curl -sSLfo "${dest}" "${url}"
}

echo "[fonts] downloading woff2 (latin-ext subset)"
download "${newsreaderRomanUrl}"  "${fontsDir}/Newsreader-VF.woff2"
download "${newsreaderItalicUrl}" "${fontsDir}/Newsreader-Italic-VF.woff2"
download "${jetbrainsMonoUrl}"    "${fontsDir}/JetBrainsMono-VF.woff2"

echo "[fonts] downloading OFL licenses"
download "${newsreaderLicenseUrl}"    "${fontsDir}/Newsreader-LICENSE.txt"
download "${jetbrainsMonoLicenseUrl}" "${fontsDir}/JetBrainsMono-LICENSE.txt"

echo "[fonts] done. files placed in ${fontsDir#"${projectRoot}/"}/"
ls -la "${fontsDir}"
