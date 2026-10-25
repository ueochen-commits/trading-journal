import React from 'react';

interface Props {
  lightSrc: string;
  darkSrc: string;
  style?: React.CSSProperties;
}

/** Both assets are ready before switching themes; decorative in either mode. */
const ThemeIllustration: React.FC<Props> = ({ lightSrc, darkSrc, style }) => (
  <>
    <img src={lightSrc} className="block dark:hidden" alt="" aria-hidden="true" style={style} />
    <img src={darkSrc} className="hidden dark:block" alt="" aria-hidden="true" style={style} />
  </>
);
export default ThemeIllustration;
