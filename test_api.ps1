# PowerShell test script for Pickleball Court Booking API
# Make sure server is running on localhost:3000

$BaseURL = "http://localhost:3000/api"

Write-Host "🏓 Testing Pickleball Bồ Đề API" -ForegroundColor Green
Write-Host "====================================="

# Test 1: Health check
Write-Host "`n1. Testing Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
    Write-Host "✅ Server is healthy" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Get all courts
Write-Host "`n2. Testing GET /public/courts" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/public/courts?activeOnly=true" -Method GET
    Write-Host "✅ Courts retrieved successfully" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 3: Get services
Write-Host "`n3. Testing GET /public/services" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/public/services" -Method GET
    Write-Host "✅ Services retrieved successfully" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 4: Check availability
Write-Host "`n4. Testing GET /public/availability" -ForegroundColor Yellow
$testDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
try {
    $response = Invoke-RestMethod -Uri "$BaseURL/public/availability?date=$testDate&start_time=09:00&end_time=11:00" -Method GET
    Write-Host "✅ Availability checked successfully" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 5: Calculate price
Write-Host "`n5. Testing POST /public/availability/calculate-price" -ForegroundColor Yellow
$priceBody = @{
    ngay_su_dung = $testDate
    slots = @(
        @{
            san_id = 1
            start_time = "09:00"
            end_time = "11:00"
        }
    )
    services = @(
        @{
            dich_vu_id = 1
            so_luong = 2
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$BaseURL/public/availability/calculate-price" -Method POST -Body $priceBody -ContentType "application/json"
    Write-Host "✅ Price calculated successfully" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 6: Create booking
Write-Host "`n6. Testing POST /public/bookings" -ForegroundColor Yellow
$bookingBody = @{
    user_id = $null
    customer = @{
        full_name = "Test User PowerShell"
        phone = "0987654321"
        email = "test.powershell@email.com"
    }
    ngay_su_dung = $testDate
    slots = @(
        @{
            san_id = 1
            start_time = "14:00"
            end_time = "16:00"
            ghi_chu = "Test booking from PowerShell"
        }
    )
    services = @(
        @{
            dich_vu_id = 1
            so_luong = 1
        }
    )
    payment_method = "cash"
    note = "Test booking note from PowerShell"
} | ConvertTo-Json -Depth 10

try {
    $bookingResponse = Invoke-RestMethod -Uri "$BaseURL/public/bookings" -Method POST -Body $bookingBody -ContentType "application/json"
    Write-Host "✅ Booking created successfully" -ForegroundColor Green
    $bookingResponse | ConvertTo-Json -Depth 10
    
    $bookingToken = $bookingResponse.data.booking.ma_pd
    
    if ($bookingToken) {
        Write-Host "`n📋 Booking Token: $bookingToken" -ForegroundColor Cyan
        
        # Test 7: Get booking by token
        Write-Host "`n7. Testing GET /public/bookings/$bookingToken" -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod -Uri "$BaseURL/public/bookings/$bookingToken" -Method GET
            Write-Host "✅ Booking retrieved successfully" -ForegroundColor Green
            $response | ConvertTo-Json -Depth 10
        } catch {
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }
        
        # Test 8: Cancel booking
        Write-Host "`n8. Testing PUT /public/bookings/$bookingToken/cancel" -ForegroundColor Yellow
        $cancelBody = @{
            reason = "Test cancellation from PowerShell"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "$BaseURL/public/bookings/$bookingToken/cancel" -Method PUT -Body $cancelBody -ContentType "application/json"
            Write-Host "✅ Booking cancelled successfully" -ForegroundColor Green
            $response | ConvertTo-Json -Depth 10
        } catch {
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Booking creation failed, no token received" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error creating booking: $_" -ForegroundColor Red
}

Write-Host "`n🎉 API testing completed!" -ForegroundColor Green
Write-Host "==============================="
Write-Host "📝 Results Summary:" -ForegroundColor Cyan
Write-Host "- Health Check: Server status verified"
Write-Host "- Courts API: Court data retrieval tested"
Write-Host "- Services API: Service data retrieval tested" 
Write-Host "- Availability API: Court availability checking tested"
Write-Host "- Price Calculation: Booking price calculation tested"
Write-Host "- Booking Creation: Full booking flow tested"
Write-Host "- Booking Retrieval: Token-based booking lookup tested"
Write-Host "- Booking Cancellation: Cancellation workflow tested"
Write-Host "`n🌐 Frontend URL: http://localhost:5173"
Write-Host "🔧 Backend URL: http://localhost:3000"
Write-Host "📚 API Docs: Available in API_Documentation.md"
Write-Host "📮 Postman: Import Postman_Collection.json"