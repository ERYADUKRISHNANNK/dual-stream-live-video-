<#
PowerShell helper: create a Desktop shortcut that launches run_all.bat
Usage:
  1. Open PowerShell as the current user
  2. Run: `.	ools\create_desktop_shortcut.ps1` from the repo root, or right-click and Run with PowerShell
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

$target = (Resolve-Path "..\run_all.bat").Path
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Aegis Platform.lnk"

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = $target
$sc.WorkingDirectory = (Resolve-Path "..").Path
$sc.WindowStyle = 1
$sc.IconLocation = "$target,0"
$sc.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
