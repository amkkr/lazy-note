#!/usr/bin/env bash
# 概要
#   Newsreader VF (OFL 1.1) の latin / latin-ext subset woff2 と
#   OFL ライセンス本文を public/fonts/ に配置するスクリプト。
#
# 参照
#   docs/rfc/editorial-citrus/03-typography.md
#   docs/rfc/editorial-citrus/08-roadmap.md (R-1)
#
# 配信元
#   フォント: Google Fonts CSS2 API → fonts.gstatic.com (OFL 1.1)
#   ライセンス: productiontype/Newsreader リポジトリ master ブランチ
#
# 使い方
#   再取得 (idempotent / 既存ファイルは上書き):
#     ./scripts/download-fonts.sh
#   SHA-256 検証のみ実行 (CI 用):
#     ./scripts/download-fonts.sh --verify
#
# サプライチェーン検証
#   public/fonts/fonts.sha256 にハッシュを pin する。
#   --verify は配置済みファイルのハッシュを確認するだけで再取得しない。

set -euo pipefail

scriptDir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
projectRoot=$(cd "${scriptDir}/.." && pwd)
fontsDir="${projectRoot}/public/fonts"
shaFile="${fontsDir}/fonts.sha256"

mode="download"
if [[ ${1:-} == "--verify" ]]; then
  mode="verify"
fi

# Google Fonts CSS API から取得した woff2 の直リンク (Newsreader v26 時点)。
# CSS API は fonts.gstatic.com への永続化された hash 入り URL を返すため、
# unicode-range とハッシュは固定 (フォントファイル自体は GitHub の
# productiontype/Newsreader と同一の OFL 1.1 ビルド)。
newsreaderLatinUrl="https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2"
newsreaderLatinExtUrl="https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK439DyjIJFJpeBZQ.woff2"

# OFL 1.1 ライセンス本文 (Newsreader 公式リポジトリ master)。
newsreaderLicenseUrl="https://raw.githubusercontent.com/productiontype/Newsreader/master/OFL.txt"

newsreaderLatinPath="${fontsDir}/Newsreader-VF-Latin.woff2"
newsreaderLatinExtPath="${fontsDir}/Newsreader-VF-LatinExt.woff2"
newsreaderLicensePath="${fontsDir}/Newsreader-LICENSE.txt"

download() {
  local url="$1"
  local dest="$2"
  echo "  -> ${dest##*/}"
  curl -sSLfo "${dest}" "${url}"
}

if [[ ${mode} == "download" ]]; then
  mkdir -p "${fontsDir}"

  echo "[fonts] downloading woff2 (Newsreader VF latin / latin-ext)"
  download "${newsreaderLatinUrl}" "${newsreaderLatinPath}"
  download "${newsreaderLatinExtUrl}" "${newsreaderLatinExtPath}"

  echo "[fonts] downloading OFL license"
  download "${newsreaderLicenseUrl}" "${newsreaderLicensePath}"

  echo "[fonts] writing SHA-256 manifest -> ${shaFile##*/}"
  (
    cd "${fontsDir}"
    shasum -a 256 \
      "Newsreader-VF-Latin.woff2" \
      "Newsreader-VF-LatinExt.woff2" \
      "Newsreader-LICENSE.txt" \
      > "${shaFile}"
  )

  echo "[fonts] done. files placed in ${fontsDir#"${projectRoot}/"}/"
  ls -la "${fontsDir}"
  exit 0
fi

# --verify モード: 既存ファイルの SHA-256 が manifest と一致するか確認する。
echo "[fonts] verifying SHA-256 against ${shaFile##*/}"
if [[ ! -f "${shaFile}" ]]; then
  echo "[fonts] ERROR: ${shaFile} not found. Run without --verify first." >&2
  exit 1
fi
(
  cd "${fontsDir}"
  shasum -a 256 -c "${shaFile##*/}"
)
echo "[fonts] verified."
