# Downloads service

`saveDialog.ts` configures Electron's native download save prompt with a
suggested filename under the user's Downloads directory. The filename is
reduced to its basename, invalid Windows characters and reserved names are
handled, and empty or dot-only names fall back to `download`. The suggested
path stays inside that folder;
the user chooses the final save location in the native dialog.

Download progress UI, history, and management are not implemented. See
`docs/ROADMAP.md`.
