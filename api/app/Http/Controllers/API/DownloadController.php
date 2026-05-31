<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DownloadToken;
use App\Services\SecureDownloadService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DownloadController extends Controller
{
    public function __construct(private SecureDownloadService $downloadService) {}

    /**
     * GET /api/download/{token}
     *
     * Validates the signed token, increments use count, streams the PDF.
     * Does NOT require Sanctum auth — the token IS the auth.
     * Tokens are 15-minute HMAC-signed URLs, max 5 uses.
     */
    public function serve(Request $request, string $token): BinaryFileResponse
    {
        // 1. Verify HMAC signature embedded in the token URL
        $this->downloadService->validateSignature($request);

        // 2. Look up the DB token record
        $record = DownloadToken::with('product')
            ->where('token', $token)
            ->firstOrFail();

        // 3. Check validity (expiry + use count)
        abort_unless($record->isValid(), 410, 'This download link has expired or reached its limit. Please visit your dashboard to get a fresh link.');

        // 4. Increment use
        $record->incrementUse();

        // 5. Resolve the file path — stored outside public/ for security
        $pdfPath = storage_path('ebooks/' . $record->product->pdf_path);
        abort_unless(file_exists($pdfPath), 404, 'File not found on server.');

        $filename = Str::slug($record->product->title) . '.pdf';

        return response()->download($pdfPath, $filename, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'X-Robots-Tag'        => 'noindex',
            'Cache-Control'       => 'no-store',
        ]);
    }
}
