format:
	@echo "[format] Formatting Python code with black..."
	black .

lint:
	@echo "[lint] Linting Python code with pylint..."
	@if [ "$(find . -name '*.py' | wc -l)" -gt 0 ]; then pylint $(find . -name '*.py'); else echo "No Python files to lint."; fi

test:
	@echo "[test] Running Python tests with pytest..."
	@if [ "$(find . -name 'test_*.py' | wc -l)" -gt 0 ]; then pytest --cov=. || exit 1; else echo "No Python test files to run."; fi
