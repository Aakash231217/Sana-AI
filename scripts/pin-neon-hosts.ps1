# Pin Neon DNS for the Sana-AI dev DB so Prisma can connect even when
# the local DNS resolver refuses to answer. Run elevated.
$ip = '3.218.140.61'
$hostsPath = "$env:WINDIR\System32\drivers\etc\hosts"
$entries = @(
    "$ip ep-bold-sun-adv14xpz.c-2.us-east-1.aws.neon.tech",
    "$ip ep-bold-sun-adv14xpz-pooler.c-2.us-east-1.aws.neon.tech"
)
$current = Get-Content $hostsPath -Raw
$append = "`r`n# Sana-AI Neon DNS pin (temporary)`r`n" + ($entries -join "`r`n") + "`r`n"
$missing = $entries | Where-Object { $current -notmatch [regex]::Escape($_) }
if ($missing.Count -eq 0) {
    Write-Host 'Neon entries already present in hosts file.'
} else {
    Add-Content -Path $hostsPath -Value $append
    Write-Host 'Added Neon entries to hosts file.'
}
