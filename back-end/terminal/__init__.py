from terminal.ls import cmd_ls
from terminal.pwd import cmd_pwd
from terminal.echo import cmd_echo
from terminal.comando_default import cmd_default

def run_command(command: str) -> dict:
    parts = command.split()
    cmd = parts[0].lower()
    args = parts[1:]

    if cmd == 'ls':
        return cmd_ls(args)
    elif cmd == 'pwd':
        return cmd_pwd(args)
    elif cmd == 'echo':
        return cmd_echo(args)
    else:
        return cmd_default(command)
