Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\DESKTOP\.gemini\antigravity-ide\brain\f8ffa61a-1a1a-410e-9179-5e778878bf58\.user_uploaded\media_1793270033686.jpg"
$assetsDir = "d:\Projects\TaskFlow\mobile\assets"

if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

$srcImg = [System.Drawing.Bitmap]::FromFile($sourcePath)

function Save-ScaledImage {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$canvasW,
        [int]$canvasH,
        [int]$drawW,
        [int]$drawH,
        [int]$drawX,
        [int]$drawY,
        [string]$outputPath,
        [System.Drawing.Color]$bgColor
    )
    $dest = New-Object System.Drawing.Bitmap($canvasW, $canvasH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.Clear($bgColor)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $destRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawW, $drawH)
    $g.DrawImage($source, $destRect)
    $g.Dispose()

    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Output "Generated: $outputPath ($canvasW x $canvasH)"
}

$white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)

# 1. Standard icon.png (1024x1024)
Save-ScaledImage -source $srcImg -canvasW 1024 -canvasH 1024 -drawW 1024 -drawH 1024 -drawX 0 -drawY 0 -outputPath "$assetsDir\icon.png" -bgColor $white

# 2. Android adaptive-icon.png (1024x1024, scaled to 820x820 safe zone)
Save-ScaledImage -source $srcImg -canvasW 1024 -canvasH 1024 -drawW 820 -drawH 820 -drawX 102 -drawY 102 -outputPath "$assetsDir\adaptive-icon.png" -bgColor $white

# 3. splash.png (1024x1024, centered branded splash)
Save-ScaledImage -source $srcImg -canvasW 1024 -canvasH 1024 -drawW 640 -drawH 640 -drawX 192 -drawY 192 -outputPath "$assetsDir\splash.png" -bgColor $white

# 4. favicon.png (48x48)
Save-ScaledImage -source $srcImg -canvasW 48 -canvasH 48 -drawW 48 -drawH 48 -drawX 0 -drawY 0 -outputPath "$assetsDir\favicon.png" -bgColor $white

$srcImg.Dispose()
Write-Output "All TaskFlow icon assets successfully converted and saved!"
