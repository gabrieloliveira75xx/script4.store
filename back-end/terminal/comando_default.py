def cmd_default(command: str) -> dict:
    return {
        "stdout": "",
        "stderr": f"bash: {command}: command not found",
        "returncode": 127
    }
