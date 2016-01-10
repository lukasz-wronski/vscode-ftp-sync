#FTP-Sync extension for VS Code

There are four commands available.
You can access them from Ctrl+Shift+P prompt.

![img](http://i.imgur.com/W9h4pwW.gif)

## Ftp-sync: Init

Initialize the configuration file for ftp-sync. Allows to precise FTP connection details and additional options including __automatic upload on save__.

## Ftp-sync: Sync Local to Remote

Displays synchronization wizard to configure sync operation that changes ftp files and folders to match project files.

## Ftp-sync: Sync Remote to Local

Displays synchronization wizard to configure sync operation that changes project files and folders to match ftp files.

## Ftp-sync: Commit

Commits reviewed list of changes made with Sync Local to Remote or Sync Remote to Local command.

--------

## To be added soon:

- Config validation (add minimal configuration requirement)
- Better connection error handling
- More real life testing
= Bug fixes

## Future plans

- Integration with git-ftp

### Found any bugs? Got any questions or ideas?
- Rise a ticket [here](https://github.com/lukasz-wronski/vscode-ftp-sync/issues)!
- Contact me at vscode[at]lukaszwronski.pl

I'm looking forward to get any feedback from extension users!

------

Use at your own risk - I do not guarantee that it will work correctly!

------

## Version history

- 0.2.2
    - Fix for [Upload on save don't track ignored files](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/15)
- 0.2.1
	- Fix for [Save on second try](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/12)
- 0.2.0
	- Rewritten sync mechanism
	- Changes based on [this conversation](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/2):
		- New sync wizard
		- Reviewing changes before save
		- Choose to remove orphans or not (safe sync)
	- Fix for [uncontrolled number of ftp connections](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/4)
- 0.1.4
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