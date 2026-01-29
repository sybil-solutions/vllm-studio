# vLLM Studio Desktop Scaffolding

This directory provides a lightweight, cross-platform daemon scaffold for running
the controller as a background service. It is meant to back a desktop UI shell
that connects over localhost.

Included scripts:
- `daemon-start.sh`: start controller in the background and write a PID file.
- `daemon-stop.sh`: stop controller using the PID file.
- `daemon-status.sh`: print daemon status.

These scripts are intentionally minimal and can be wrapped by a GUI installer or
desktop app (Electron/Tauri/Swift) to manage the core daemon lifecycle.
