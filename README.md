#FTP-Sync extension for VS Code

There are three commands available so far.
You can access them from Ctrl+Shift+P prompt.

## Ftp-sync: Init

Initialize the configuration file for ftp-sync. Allows to precise FTP connection details and additional options including __automatic upload on save__.

## Ftp-sync: Sync Local to Remote

Performs full synchronization for selected local directory. Adds and removes files on FTP server to match local files structure.

## Ftp-sync: Download remote directory

Allows to download selected or root directory from FTP, might overwrite local files.

--------

## To be added soon:

- Config validation (add minimal configuration requirement)
- Better progress indication in sync process
- Better error handling
- Some real life testing

## Plans for future:

- Add own or extend implementation of ftpsync library to better control the syncing process
- Command for upload files to FTP (unlike sync without removing files on FTP)

### Found any bugs? Got any questions or ideas?
- Rise a ticket [here](https://github.com/lukasz-wronski/vscode-ftp-sync/issues)!
- Contact me at vscode[at]lukaszwronski.pl

I'm looking forward to get any feedback from extension users!

------

So far this is just one weekend project so don't expect much yet :) Use at your own risk - I do not guarantee that it will work correctly!

------

## Version history

- 0.1.3
	- Fix for [No handler found for the command: 'extension.ftpsyncdownload'](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/1)
- 0.1.2
	- Basic progress indication in sync process
	- Better error handling in sync command
	- Github links in package.json
- 0.1.1 
	- All information messages moved to status bar
	- Removed "alertOnSync" parameter from config
	- Addedd progress indication in download process
	- Fixes in download process
- 0.1.0 
	- First version containing all basic features