def cmd_ls(args) -> dict:
    # Simulação simples: lista arquivos fixos
    files = [
        "app.py", "requirements.txt", "README.md", "src", "node_modules"
    ]
    output = "\n".join(files)
    return {"stdout": output, "stderr": "", "returncode": 0}
