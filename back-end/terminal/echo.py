def cmd_echo(args) -> dict:
    output = " ".join(args)
    return {"stdout": output, "stderr": "", "returncode": 0}
