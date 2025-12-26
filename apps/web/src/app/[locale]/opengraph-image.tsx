import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'miConsu';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Simple QR Icon shape */}
          <div style={{
            width: '100px',
            height: '100px',
            display: 'flex',
            background: '#2563EB',
            borderRadius: '16px',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '60px', height: '60px', background: 'white', borderRadius: '4px' }}></div>
          </div>
          <div style={{ fontSize: 80, fontWeight: 'bold', color: '#111827', display: 'flex' }}>
            miConsu
          </div>
        </div>
        <div style={{ marginTop: '20px', fontSize: 32, color: '#6B7280' }}>
          Free QR Code Generator & Analytics
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
