# Exercise native HTML/OLE dragging with OS mouse input on the disposable runner.
param([int]$FromX, [int]$FromY, [int]$ToX, [int]$ToY, [double]$Scale = 1)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class DesktopMouse {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr window, ref Point point);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
$app = Get-Process -Name 'classic-win-games' | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
if (!$app) { throw 'No application window for native dragging' }
$origin = New-Object DesktopMouse+Point
if (![DesktopMouse]::ClientToScreen($app.MainWindowHandle, [ref]$origin)) { throw 'Cannot locate application client area' }
[DesktopMouse]::SetForegroundWindow($app.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 200
$x1 = $origin.X + [int]($FromX * $Scale)
$y1 = $origin.Y + [int]($FromY * $Scale)
$x2 = $origin.X + [int]($ToX * $Scale)
$y2 = $origin.Y + [int]($ToY * $Scale)
[DesktopMouse]::SetCursorPos($x1, $y1) | Out-Null
Start-Sleep -Milliseconds 100
[DesktopMouse]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
try {
  Start-Sleep -Milliseconds 150
  for ($step = 1; $step -le 30; $step++) {
    [DesktopMouse]::SetCursorPos([int]($x1 + ($x2-$x1)*$step/30), [int]($y1 + ($y2-$y1)*$step/30)) | Out-Null
    Start-Sleep -Milliseconds 20
  }
  Start-Sleep -Milliseconds 150
} finally {
  [DesktopMouse]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
}
