import { useEffect } from 'react';

/**
 * Component that loads bundled fonts from the backend into the browser
 * This ensures fonts render correctly in the UI before being used in PDFs
 */
const FontLoader: React.FC = () => {
  useEffect(() => {
    // Create a link element to load the font CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'http://localhost:5001/api/font-css';
    link.type = 'text/css';
    
    // Add to document head
    document.head.appendChild(link);
    
    console.log('Loading bundled fonts from backend...');
    
    // Cleanup function
    return () => {
      document.head.removeChild(link);
    };
  }, []);
  
  return null; // This component doesn't render anything
};

export default FontLoader;
