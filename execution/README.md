# Execution Scripts (Layer 3: Doing the work)

This directory contains deterministic Python scripts.

## Guidelines

- Scripts should be focused, modular, testable, and well-commented.
- Environment variables and credentials should be loaded via `.env` / `python-dotenv`.
- Script outputs should either write intermediate files to `.tmp/` or export deliverables directly to cloud services.
- Follow self-annealing principles when fixing errors.
