Unicode true
RequestExecutionLevel user
Name "ISAC ERP"
OutFile "..\release-installer\ISAC ERP Setup 0.0.0.exe"
InstallDir "$LOCALAPPDATA\Programs\ISAC ERP"
InstallDirRegKey HKCU "Software\ISAC ERP" "InstallDir"
ShowInstDetails show
ShowUninstDetails show

Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

Section "ISAC ERP"
  SetOutPath "$INSTDIR"
  File /r "..\release\win-unpacked\*"
  WriteRegStr HKCU "Software\ISAC ERP" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ISAC ERP" "DisplayName" "ISAC ERP"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ISAC ERP" "UninstallString" '"$INSTDIR\Uninstall ISAC ERP.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ISAC ERP" "DisplayIcon" "$INSTDIR\ISAC ERP.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ISAC ERP" "DisplayVersion" "0.0.0"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ISAC ERP" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ISAC ERP" "NoRepair" 1
  CreateShortcut "$DESKTOP\ISAC ERP.lnk" "$INSTDIR\ISAC ERP.exe"
  CreateShortcut "$SMPROGRAMS\ISAC ERP.lnk" "$INSTDIR\ISAC ERP.exe"
  WriteUninstaller "$INSTDIR\Uninstall ISAC ERP.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\ISAC ERP.lnk"
  Delete "$SMPROGRAMS\ISAC ERP.lnk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ISAC ERP"
  DeleteRegKey HKCU "Software\ISAC ERP"
  RMDir /r "$INSTDIR"
SectionEnd
