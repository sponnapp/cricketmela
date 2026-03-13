---
name: commit
description: Commit local changes, review and push it to remote
argument-hint: r&m
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Fetch the latest changes from git, review the diffs, and commit the changes with a meaningful message. Finally, push the commit to the remote repository.
Ask for confirmation before committing and pushing.
If there are any merge conflicts, identify the conflicting files and provide instructions on how to resolve them.
If the commit is successful, provide a summary of the changes that were committed and pushed.