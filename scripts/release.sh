#!/usr/bin/env bash
#
# engram release helper — interactive, idempotent.
#
# Runs through the checklist for cutting a new version:
#   1. Working tree is clean
#   2. On the right branch
#   3. Tests + build green
#   4. Bump package.json version
#   5. Commit + tag + push
#   6. Optionally: npm publish (user confirms, 2FA happens manually)
#
# Usage:
#   scripts/release.sh <new-version>
#   scripts/release.sh 0.2.0

set -euo pipefail

NEW_VERSION="${1:-}"
if [[ -z "$NEW_VERSION" ]]; then
  echo "Usage: scripts/release.sh <version>    (e.g. 0.2.0)" >&2
  exit 1
fi

# Basic semver sanity check
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "error: '$NEW_VERSION' doesn't look like a semver (expected e.g. 0.2.0)" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

confirm() {
  read -r -p "$1 [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

echo "=== engram release: v${NEW_VERSION} ==="
echo

# 1. Working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree has uncommitted changes. Commit or stash first." >&2
  git status --short
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Current branch: ${CURRENT_BRANCH}"
if [[ "$CURRENT_BRANCH" != "main" ]] && ! confirm "Not on main — continue?"; then
  exit 1
fi

# 2. Tests + build
echo
echo "--- Running tests ---"
npm ci --silent
npm run build
npx vitest run

# 3. Bump version
CURRENT_VERSION="$(node -p "require('./package.json').version")"
echo
echo "Current version: ${CURRENT_VERSION}"
echo "New version:     ${NEW_VERSION}"
if ! confirm "Bump package.json and commit?"; then
  exit 1
fi

# Use npm version to do the bump + tag + commit in one shot. --no-git-tag-version
# gives us control; we create the tag manually after pushing. If any step
# between the bump and the commit fails, restore package.json so the next
# run doesn't trip the "working tree dirty" guard with an unrecoverable state.
npm version "$NEW_VERSION" --no-git-tag-version > /dev/null
trap 'git checkout -- package.json 2>/dev/null || true' ERR
git add package.json
git commit -m "chore: release v${NEW_VERSION}"
trap - ERR

# 4. Tag
git tag "v${NEW_VERSION}"

# 5. Push
if confirm "Push commit + tag to origin/${CURRENT_BRANCH}?"; then
  git push origin "$CURRENT_BRANCH"
  git push origin "v${NEW_VERSION}"
else
  echo "Skipped push. You can run 'git push origin ${CURRENT_BRANCH} && git push origin v${NEW_VERSION}' later."
fi

# 6. Publish
echo
if confirm "Publish to npm (you'll be prompted for 2FA)?"; then
  npm publish
  echo "Published. Verify with: npx engramx@${NEW_VERSION} --help"
else
  echo "Skipped npm publish. Run 'npm publish' manually when ready."
fi

echo
echo "=== Release v${NEW_VERSION} complete ==="
