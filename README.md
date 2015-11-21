#FTP-Sync extension for VS Code

Check out the [project page on github](https://github.com/lukasz-wronski/vscode-ftp-sync)

There are two commands available so far.
You can access them from Ctrl+Shift+P prompt.

## Ftp-sync: Init

Initialize the configuration file for ftp-sync. Allows to precise FTP connection details and additional options including __automatic upload on save__.

## Ftp-sync: Sync Local to Remote

Performs full synchronization for selected local directory. Adds and removes files on FTP server to match local files structure.

## To be added soon:

- Command for downloading code from FTP
- Command for upload code to FTP (unlike sync without removing files on FTP)
- Better error handling

### Found any bugs? Got any questions or ideas?
Rise a ticket [here](https://github.com/lukasz-wronski/vscode-ftp-sync/issues)!

Took me 6 hours to code it so don't expect much yet :)