import React from 'react';

interface ToothProps {
  id: number;
  data: {
    status: string;
    surfaces: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
      center?: string;
    };
  };
  onSurfaceClick: (toothId: number, surface: string) => void;
  onToothClick: (toothId: number) => void;
}

const Tooth: React.FC<ToothProps> = ({ id, data, onSurfaceClick, onToothClick }) => {
  // Parsing value format "condition:state" (e.g. "caries:todo")
  const parseValue = (value?: string) => {
    if (!value) return null;
    const parts = value.split(':');
    // Backward compatibility: if no colon, assume realized (red) or just the condition? 
    // Let's assume red (realized) if just "caries", or migrating old data.
    const condition = parts[0];
    const state = parts[1] || 'done';
    return { condition, state };
  };

  const getVisuals = (value?: string) => {
    const parsed = parseValue(value);
    if (!parsed) return { fill: 'white', text: '', textColor: 'transparent' };

    const { condition, state } = parsed;
    const textColor = state === 'todo' ? '#3b82f6' : '#ef4444'; // blue-500 : red-500
    // Fill should be white so text is visible, or transparent?
    // If we want white background for the tooth surface:
    const fill = 'white';

    let text = '';
    switch (condition) {
      case 'caries': text = 'C'; break;
      case 'filling': text = 'O'; break;
      case 'crown': text = 'Co'; break;
      case 'endodontics': text = 'E'; break;
      default: text = ''; // Healthy or unknown
    }

    return { fill, text, textColor };
  };

  const isMissing = data.status === 'missing';

  const renderSurface = (points: string, surfaceKey: string, textX: number, textY: number) => {
    // @ts-ignore
    const value = data.surfaces[surfaceKey];
    const { fill, text, textColor } = getVisuals(value);

    return (
      <g onClick={(e) => { e.stopPropagation(); onSurfaceClick(id, surfaceKey); }} className="hover:opacity-80 transition-opacity cursor-pointer">
        <polygon
          points={points}
          fill={fill}
          stroke="#9ca3af"
          strokeWidth="1"
        />
        {text && (
          <text x={textX} y={textY} fill={textColor} fontSize="20" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
            {text}
          </text>
        )}
      </g>
    );
  };

  // Center rect handled separately for text positioning
  const renderCenter = (surfaceKey: string) => {
    // @ts-ignore
    const value = data.surfaces[surfaceKey];
    const { fill, text, textColor } = getVisuals(value);

    return (
      <g onClick={(e) => { e.stopPropagation(); onSurfaceClick(id, surfaceKey); }} className="hover:opacity-80 transition-opacity cursor-pointer">
        <rect
          x="25" y="25" width="50" height="50"
          fill={fill}
          stroke="#9ca3af"
          strokeWidth="1"
        />
        {text && (
          <text x="50" y="50" fill={textColor} fontSize="24" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
            {text}
          </text>
        )}
      </g>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 cursor-pointer transition-transform hover:scale-105" onClick={() => onToothClick(id)}>

        {/* Main Tooth Shape SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
          {/* Top (Vestibular for Upper, Lingual for Lower - simplified as Top) */}
          {/* Centroid approx 50, 12 */}
          {renderSurface("0,0 100,0 75,25 25,25", "top", 50, 12)}

          {/* Bottom */}
          {/* Centroid approx 50, 88 */}
          {renderSurface("0,100 100,100 75,75 25,75", "bottom", 50, 88)}

          {/* Left */}
          {/* Centroid approx 12, 50 */}
          {renderSurface("0,0 0,100 25,75 25,25", "left", 12, 50)}

          {/* Right */}
          {/* Centroid approx 88, 50 */}
          {renderSurface("100,0 100,100 75,75 75,25", "right", 88, 50)}

          {/* Center */}
          {renderCenter("center")}

          {/* Cross for missing tooth */}
          {isMissing && (
            <line x1="0" y1="0" x2="100" y2="100" stroke="red" strokeWidth="4" />
          )}
          {isMissing && (
            <line x1="100" y1="0" x2="0" y2="100" stroke="red" strokeWidth="4" />
          )}
        </svg>
      </div>
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{id}</span>
    </div>
  );
};

export default Tooth;
