# Foundation checks

The documentation workflow validates that required foundation documents are nonempty and that the committed configuration is valid JSON. It does not build or test the application.

## Local equivalent
Run from the repository root:

```powershell
python -c "import json; from pathlib import Path; json.loads(Path('config/doctor.config.json').read_text(encoding='utf-8')); print('JSON valid')"
```

## Release limitation
A passing documentation check does not establish Windows compatibility, application security or recovery safety. Those require separate implementation and validation.