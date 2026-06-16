$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -match 'C:\\COOP\\CINECITO2.0' -or $_.CommandLine -match 'CINECITO2.0') }
$procs | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress
