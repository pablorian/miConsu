import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase, { QRCode, Scan } from '@repo/database';
import useragent from 'useragent';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  const { shortId } = await params;

  if (!shortId) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const qr = await QRCode.findOne({ shortId });

    if (!qr) {
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }

    // Analytics
    const userAgentString = request.headers.get('user-agent') || '';
    const agent = useragent.parse(userAgentString);
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // Geo lookup
    let country = 'Unknown';
    let city = 'Unknown';

    // Prioritize Cloudflare / Vercel headers
    // Cloudflare: CF-IPCountry
    // Vercel: x-vercel-ip-country, x-vercel-ip-city
    const cfCountry = request.headers.get('cf-ipcountry');
    const cfCity = request.headers.get('cf-ipcity');
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    const vercelCity = request.headers.get('x-vercel-ip-city');

    if (cfCountry) {
      country = cfCountry;
      city = cfCity || 'Unknown';
    } else if (vercelCountry) {
      country = vercelCountry;
      city = vercelCity || 'Unknown';
    }

    // Check for local/private IPs fallback behavior
    if (country === 'Unknown') {
      const cleanIp = ip.split(',')[0].trim();
      if (cleanIp === '::1' || cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.')) {
        city = 'Local Network';
        country = 'Private';
      }
    }

    // Log the scan asynchronously (fire and forget mostly, to not block redirect too long)
    // But awaiting it ensures we don't lose data on Vercel/Serverless
    await Scan.create({
      qrCodeId: qr._id,
      ip,
      userAgent: userAgentString,
      device: agent.device.toString(),
      os: agent.os.toString(),
      // browser: agent.toAgent(),
      country,
      city,
    });

    // Increment scan count
    await QRCode.updateOne({ _id: qr._id }, { $inc: { scans: 1 } });

    let destinationUrl = qr.url;
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      destinationUrl = `https://${destinationUrl}`;
    }

    return NextResponse.redirect(destinationUrl);
  } catch (error) {
    console.error('Redirect Logic Error:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
