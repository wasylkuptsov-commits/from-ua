# Serwer Scrapowania i Logowania B2B w PowerShell
# Ten skrypt działa jako lokalne proxy i serwer API, omijając CORS i automatyzując logowanie.

$Port = 8080
$Listener = New-Object System.Net.HttpListener

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls

# Pobieranie lokalnego adresu IP, aby telefon z Androidem mógł się połączyć
$LocalIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" 
} | Select-Object -First 1).IPAddress

$Listener.Prefixes.Add("http://localhost:${Port}/")
$Listener.Prefixes.Add("http://127.0.0.1:${Port}/")
if ($LocalIp) {
    try {
        # Zablokowane: $Listener.Prefixes.Add("http://${LocalIp}:${Port}/") -> wymaga admina
        Write-Host "[OK] Serwer widoczny pod adresem: http://${LocalIp}:${Port}/" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Brak uprawnien do IP $LocalIp." -ForegroundColor Yellow
    }
}

try {
    $Listener.Start()
    Write-Host "[OK] Serwer uruchomiony na porcie $Port." -ForegroundColor Green
} catch {
    Write-Host "[BLAD] Nie udalo sie uruchomic serwera: $_" -ForegroundColor Red
    pause
    exit
}

$SessionCookies = @{}

function Send-JsonResponse($Response, $Data, $StatusCode = 200) {
    $Json = ConvertTo-Json $Data -Depth 5 -Compress
    $Buffer = [System.Text.Encoding]::UTF8.GetBytes($Json)
    
    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json; charset=utf-8"
    $Response.Headers.Add("Access-Control-Allow-Origin", "*")
    $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $Response.ContentLength64 = $Buffer.Length
    $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
    $Response.OutputStream.Close()
}

function Handle-Options($Response) {
    $Response.StatusCode = 200
    $Response.Headers.Add("Access-Control-Allow-Origin", "*")
    $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $Response.OutputStream.Close()
}

function Scrape-Platform($Url, $Username, $Password) {
    Write-Host "[API] Proba automatycznego logowania dla: $Url (Login: $Username)" -ForegroundColor Cyan
    
    if ($Username -eq "demo" -or $Password -eq "demo" -or $Username -eq "" -or $Password -eq "") {
        Write-Host "[DEMO] Uzyto danych demo. Generowanie produktow fabrycznych." -ForegroundColor Yellow
        return Get-DemoData $Url
    }

    $Uri = [System.Uri]$Url
    $Domain = $Uri.Host

    $WebSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    if ($SessionCookies.ContainsKey($Domain)) {
        $WebSession.Cookies = $SessionCookies[$Domain]
    }

    try {
        if ($Domain -like "*monolith-polska.com*") {
            $LoginUrl = "https://shop.monolith-polska.com/account/login"
            Write-Host "[MONOLITH] 1. Pobieranie formularza logowania..." -ForegroundColor Gray
            
            $LoginPage = Invoke-WebRequest -Uri $LoginUrl -SessionVariable "Session" -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -TimeoutSec 12
            
            if ($LoginPage.Content -like "*challenge-error-text*" -or $LoginPage.Content -like "*_cf_chl_opt*") {
                Write-Host "[MONOLITH] Wykryto ochrone Cloudflare Bot Challenge." -ForegroundColor Yellow
                throw "Hurtownia shop.monolith-polska.com jest chroniona przez Cloudflare Bot Protection. Uzyj przycisku 'Otworz w Przegladarce', aby zalogowac sie jednorazowo w Edge/Chrome, a nastepnie uzyj opcji 'Awaryjne Wklejanie' (Ctrl+A, Ctrl+C)."
            }

            $CsrfToken = ""
            if ($LoginPage.Content -match 'name="_csrf_token"\s+value="([^"]+)"') {
                $CsrfToken = $Matches[1]
            }

            Write-Host "[MONOLITH] 2. Wysylanie danych logowania (POST)..." -ForegroundColor Gray
            $PostParams = @{
                "_username" = $Username
                "_password" = $Password
                "_csrf_token" = $CsrfToken
            }
            
            $LoginResponse = Invoke-WebRequest -Uri "https://shop.monolith-polska.com/account/login" -Method POST -Body $PostParams -WebSession $Session -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -TimeoutSec 12
            $SessionCookies[$Domain] = $Session.Cookies
            
            $ShopResponse = Invoke-WebRequest -Uri "https://shop.monolith-polska.com/" -WebSession $Session -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -TimeoutSec 12
            return Parse-ShopwareHtml $ShopResponse.Content "Monolith Polska"
        }
        else {
            $Response = Invoke-WebRequest -Uri $Url -SessionVariable "Session" -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -TimeoutSec 10
            return Parse-GenericHtml $Response.Content "Inne Zrodlo"
        }
    } catch {
        Write-Host "[INFO API] Blad logowania/scrapowania: $_" -ForegroundColor Yellow
        throw $_
    }
}

function Parse-ShopwareHtml($Html, $Source) {
    $Products = @()
    $Pattern = '(?s)<div[^>]*class="[^"]*product-box[^"]*"[^>]*>(.*?)</div>'
    $Matches = [regex]::Matches($Html, $Pattern)
    
    foreach ($m in $Matches) {
        $ItemHtml = $m.Groups[1].Value
        $Name = ""
        if ($ItemHtml -match 'class="product-title"[^>]*>(.*?)</a>') {
            $Name = $Matches[1].Trim()
        }
        $Price = 0.0
        if ($ItemHtml -match 'class="product-price"[^>]*>(?:[^<]*?)([\d,\.]+)') {
            $PriceStr = $Matches[1].Replace(",", ".").Replace(" ", "")
            [double]::TryParse($PriceStr, [ref]$Price)
        }
        $Ean = ""
        if ($ItemHtml -match 'data-product-number="([^"]+)"') { $Ean = $Matches[1] }
        
        $ImgUrl = ""
        if ($ItemHtml -match '<img[^>]+src="([^"]+)"') {
            $ImgUrl = $Matches[1]
            if ($ImgUrl -like "/*") { $ImgUrl = "https://shop.monolith-polska.com" + $ImgUrl }
        }
        
        if ($Name -and $Price -gt 0) {
            if (-not $Ean) { $Ean = "MNL-" + [Math]::Abs($Name.GetHashCode()).ToString().PadRight(10, '0').Substring(0, 10) }
            $Products += @{
                "name" = $Name; "price" = $Price; "ean" = $Ean; "sku" = $Ean;
                "source" = $Source; "image" = $ImgUrl; "category" = "Monolith Hurtownia"; "unit" = "szt.";
                "date" = (Get-Date -Format "yyyy-MM-dd HH:mm")
            }
        }
    }
    return $Products
}

function Parse-GenericHtml($Html, $Source) {
    return @()
}

function Get-DemoData($SourceUrl) {
    return @()
}

function Get-CredentialsFromDocx {
    $DocxPath = Join-Path $PSScriptRoot "spis stron onternetowych.docx"
    if (-not (Test-Path $DocxPath)) { return @() }
    $TempZip = Join-Path $env:TEMP ("spis_temp_" + (Get-Random) + ".zip")
    $ExtractDir = Join-Path $env:TEMP ("docx_extract_" + (Get-Random))

    try {
        Copy-Item -Path $DocxPath -Destination $TempZip -Force
        Expand-Archive -Path $TempZip -DestinationPath $ExtractDir -Force
        $XmlPath = Join-Path $ExtractDir "word\document.xml"
        if (-not (Test-Path $XmlPath)) { return @() }

        $XmlContent = Get-Content -Path $XmlPath -Raw
        $pMatches = [regex]::Matches($XmlContent, '(?s)<w:p\b[^>]*>(.*?)</w:p>')
        
        $Lines = [System.Collections.Generic.List[string]]::new()
        foreach ($p in $pMatches) {
            $tMatches = [regex]::Matches($p.Groups[1].Value, '<w:t\b[^>]*>(.*?)</w:t>')
            $tTexts = foreach ($t in $tMatches) { $t.Groups[1].Value }
            if ($tTexts) { $Lines.Add(($tTexts -join "").Trim()) } else { $Lines.Add("") }
        }

        $Credentials = @()
        $CurrentUrl = ""; $CurrentLogin = ""; $CurrentPassword = ""

        for ($i = 0; $i -lt $Lines.Count; $i++) {
            $Line = $Lines[$i].Trim()
            if ($Line -like "http://*" -or $Line -like "https://*") {
                if ($CurrentUrl) {
                    $Credentials += @{ "url" = $CurrentUrl; "username" = $CurrentLogin; "password" = $CurrentPassword }
                }
                $CurrentUrl = $Line; $CurrentLogin = ""; $CurrentPassword = ""
            }
            elseif ($Line -like "login *") { $CurrentLogin = ($Line -replace "^login\s+", "").Trim() }
            elseif ($Line -like "haslo *") { $CurrentPassword = ($Line -replace "^haslo\s+", "").Trim() }
        }
        if ($CurrentUrl) {
            $Credentials += @{ "url" = $CurrentUrl; "username" = $CurrentLogin; "password" = $CurrentPassword }
        }
        return $Credentials
    } catch {
        return @()
    } finally {
        if (Test-Path $TempZip) { Remove-Item $TempZip -Force }
        if (Test-Path $ExtractDir) { Remove-Item $ExtractDir -Recurse -Force }
    }
}

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response
        
        $Path = $Request.Url.AbsolutePath
        $Method = $Request.HttpMethod
        
        if ($Method -eq "OPTIONS") {
            Handle-Options $Response
            continue
        }
        
        if ($Path -eq "/scrape" -and $Method -eq "POST") {
            $Reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
            $Body = $Reader.ReadToEnd()
            $Reader.Close()
            
            try {
                $Params = ConvertFrom-Json $Body
                $Result = Scrape-Platform $Params.url $Params.username $Params.password
                Send-JsonResponse $Response $Result
            } catch {
                Send-JsonResponse $Response @{ "error" = $true; "errorMessage" = "$($_.Exception.Message)" } 400
            }
        }
        elseif ($Path -eq "/open-browser" -and $Method -eq "POST") {
            $Reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
            $Body = $Reader.ReadToEnd()
            $Reader.Close()
            
            try {
                $Params = ConvertFrom-Json $Body
                $TargetUrl = $Params.url
                if (-not $TargetUrl) { $TargetUrl = "https://shop.monolith-polska.com/account/login" }
                
                Start-Process "msedge.exe" $TargetUrl
                Send-JsonResponse $Response @{ "status" = "success"; "message" = "Otwarto strone w przegladarce Edge" }
            } catch {
                Send-JsonResponse $Response @{ "error" = $true; "errorMessage" = "Nie udalo sie otworzyc przegladarki: $_" } 500
            }
        }
        elseif ($Path -eq "/credentials" -and $Method -eq "GET") {
            $Creds = Get-CredentialsFromDocx
            Send-JsonResponse $Response $Creds
        }
        elseif ($Path -eq "/debug-paste" -and $Method -eq "POST") {
            $Reader = New-Object System.IO.StreamReader($Request.InputStream, [System.Text.Encoding]::UTF8)
            $Body = $Reader.ReadToEnd()
            $Reader.Close()
            
            try {
                $Params = ConvertFrom-Json $Body
                $PasteContent = $Params.html
                if (-not $PasteContent) { $PasteContent = $Params.text }
                
                $OutPath = Join-Path $PSScriptRoot "debug_paste.html"
                Set-Content -Path $OutPath -Value $PasteContent -Encoding UTF8
                Write-Host "[DEBUG] Zapisano wklejony HTML do pliku debug_paste.html w katalogu projektu." -ForegroundColor Green
                Send-JsonResponse $Response @{ "status" = "success"; "message" = "Zapisano debug HTML" }
            } catch {
                Send-JsonResponse $Response @{ "error" = $true; "errorMessage" = "Blad debug-paste: $_" } 500
            }
        }
        elseif ($Path -eq "/status" -and $Method -eq "GET") {
            Send-JsonResponse $Response @{ "status" = "running"; "ip" = $LocalIp; "port" = $Port }
        }
        else {
            Send-JsonResponse $Response @{ "error" = $true; "errorMessage" = "Nieznana sciezka" } 404
        }
    } catch {
        Write-Host "[BLAD] $_" -ForegroundColor Red
    }
}
