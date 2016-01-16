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
- Bug fixes

## Future plans

- Integration with git-ftp

### Found any bugs? Got any questions or ideas?
- Rise a ticket [here](https://github.com/lukasz-wronski/vscode-ftp-sync/issues)!
- Contact me at vscode[at]lukaszwronski.pl

Please provide as much information as possible. We are dealing with diffrent ftp servers, file structures, file permissions, operating systems and it might be difficult to reproduce your error and fix it without detailed informations.

I'm looking forward to get any feedback from extension users! Contribution, especially on bug fixing is more than welcome!

Great thanks for suggestions and help with debugging for [Martin](https://github.com/kasik96), [Allan](https://github.com/EthraZa), [Maxime](https://github.com/maximedupre), [suuuunto](https://github.com/suuuunto) and all other folks who reported bugs or made improvement requests.

------

Use at your own risk - I do not guarantee that it will work correctly!

------

## Version history

- 0.2.9
    - Error message for incorrect JSON like in [this issue](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/25)
    - Closing review file after commit (pointed out in [this issue](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/23))
    - Fix for [uploadOnSave will fail for files on new created folders](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/22)
    - Added ES6 support in extension source
- 0.2.8
    - Attempt to fix [uploadOnSave will fail for files on new created folders](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/22)
- 0.2.7
    - Fix for [Sync R2L does not delete folder](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/21)
    - Replace of deprecated method `TextEditor.hide` with command call
- 0.2.6
    - Fix for [Error: EXDEV: cross-device link not permitted on mounted drive](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/6)
- 0.2.5
    - Fix for [Local to remote "Full sync" error](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/20)
- 0.2.4
    - Fix for [Duplicate folder in folder we upload to](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/19)
- 0.2.3
    - Fix for [Cant download](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/14)
- 0.2.2
    - Fix for [Upload on save don't track ignored files](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/15)
    - Added support for [ftp passive mode](https://github.com/lukasz-wronski/vscode-ftp-sync/issues/16)
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