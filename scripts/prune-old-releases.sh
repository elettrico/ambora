#!/usr/bin/env bash
# Delete published releases older than the newest KEEP (default 2), so the
# releases page carries the current version plus one to roll back to.
#
#   scripts/prune-old-releases.sh <just-published-tag> [keep]
#
# Tags are never deleted: any old version can still be rebuilt from its tag.
# Drafts and pre-releases are left alone. Releases are ordered by version, not
# by date, and nothing is pruned unless the tag just published is the newest
# version: a late rebuild of an old tag must not delete the releases that came
# after it, or itself.
set -euo pipefail

current="${1:?usage: prune-old-releases.sh <tag> [keep]}"
keep="${2:-2}"
repo_args=()
if [ -n "${GITHUB_REPOSITORY:-}" ]; then
  repo_args=(--repo "$GITHUB_REPOSITORY")
fi

tags=$(gh release list ${repo_args[@]+"${repo_args[@]}"} --limit 200 \
  --json tagName,isDraft,isPrerelease \
  --jq '.[] | select((.isDraft | not) and (.isPrerelease | not)) | .tagName' |
  sort -rV)

newest=$(printf '%s\n' "$tags" | head -n 1)
if [ "$newest" != "$current" ]; then
  echo "::notice::$current is not the newest release ($newest); not pruning"
  exit 0
fi

printf '%s\n' "$tags" | tail -n +"$((keep + 1))" | while read -r tag; do
  [ -n "$tag" ] || continue
  echo "Deleting release $tag (the tag stays)"
  gh release delete "$tag" ${repo_args[@]+"${repo_args[@]}"} --yes
done
