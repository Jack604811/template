Follow these steps to ship the current changes:

1. Run `git status` to see what changed
2. Run `git diff` to review the changes
3. Suggest a branch name based on the changes (e.g. `feat/http-node-realtime`)
4. Ask me to confirm the branch name before creating it
5. Create the branch and stage all changes with `git add .`
6. Write a conventional commit message based on the diff:
   - feat: for new features
   - fix: for bug fixes
   - refactor: for refactors
   - chore: for config/tooling changes
7. Ask me to confirm the commit message before committing
8. Push the branch to origin
9. Create a PR using `gh pr create` with:
   - Title: same as commit message
   - Body: bullet list of what changed based on the diff
   - Base branch: main
10. Output the PR URL