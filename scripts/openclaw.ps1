param(
    [string]$Mode = "check",
    [string]$Message = ""
)

Write-Host "=== OpenClaw Integration ==="
Write-Host "Mode: $Mode"

if ($Mode -eq "check") {
    # Run check logic
    # Example: openclaw system event "check"
    Write-Host "running checks..."
    if (Get-Command openclaw -ErrorAction SilentlyContinue) {
        openclaw system event "check"
    } else {
        npx --yes openclaw system event "check"
    }
} elseif ($Mode -eq "fix") {
    # Run fix logic
    $msg = if ($Message) { $Message } else { "Fix lint errors" }
    Write-Host "Fixing issues with prompt: $msg"
    
    if (Get-Command openclaw -ErrorAction SilentlyContinue) {
        openclaw agent --task "$msg"
    } else {
        npx --yes openclaw agent --task "$msg"
    }
} elseif ($Mode -eq "prompt") {
    # Run custom prompt
    if (-not $Message) {
        $Message = Read-Host "Enter prompt"
    }
    Write-Host "Running OpenClaw with prompt: $Message"
    
    if (Get-Command openclaw -ErrorAction SilentlyContinue) {
        openclaw agent --task "$Message"
    } else {
        npx --yes openclaw agent --task "$Message"
    }
} else {
    Write-Error "Unknown mode: $Mode. Usage: ./openclaw.ps1 [check|fix|prompt] [message]"
    exit 1
}
