# Open-Browser
An open-source, privacy-first, adaptive browser focused on performance, customization, and user control.

## Continuous integration

Every push to `main` and every pull request targeting `main` runs [`.github/workflows/build-windows.yml`](.github/workflows/build-windows.yml) on a Windows runner. The workflow installs dependencies with `npm ci`, runs `npm test`, then runs `npm run dist` to produce the Windows NSIS installer. The build fails the workflow if either tests or the build step fail.

The resulting installer (`release/*.exe`) is uploaded as a downloadable **workflow artifact** named `open-browser-windows-installer`, retained for 14 days. It is **not** published as a GitHub Release, and nothing is installed or updated automatically on any machine — download and run the installer yourself to try a build.

The workflow can also be run manually from the Actions tab (`workflow_dispatch`).

Automatic in-app updates are out of scope for this workflow. Shipping real auto-updates later requires a separate signed-update system (e.g. code-signing the installer and wiring up `electron-updater` against a trusted update feed) — this CI pipeline only produces an unsigned build artifact for manual testing.
