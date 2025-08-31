import { useState, useEffect } from 'react';

export default function AnimatedOnion() {
  const [sparkleFrame, setSparkleFrame] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSparkleFrame(prev => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const sparkleChars = ['*', '✦', '✧', '⋆'];
  const currentSparkle = sparkleChars[sparkleFrame];

  const onionArt = `
                           ${currentSparkle}           ${currentSparkle}
                          ,-.-.-.-.-.-.-.-, 
                       .-'                 '-.
                      /                       \\
                     /    ,-.-.-.-.-.-.-.-.    \\
                    |   .'                 '.   |
                   /  .'                     '.  \\
              ${currentSparkle}   /  /   ,-.-.-.-.-.-.-.-.   \\  \\   ${currentSparkle}
                  |  |  .'                 '.  |  |
                  |  | /                     \\ |  |
                  |  |/   ,-.-.-.-.-.-.-.-.   \\|  |
                  |  |  .'                 '.  |  |
                  |  | /                     \\ |  |
              ${currentSparkle}   |  |/   ,-.-.-.-.-.-.-.-.   \\|  |   ${currentSparkle}
                  |  |  .'                 '.  |  |
                   \\  \\ /                     \\ /  /
                    |  \\   ,-.-.-.-.-.-.-.-.   /  |
                     \\   .'                 '.   /
                      \\                       /
                       '-._             _.-'
                          '-.-.-.-.-.-.-.'.
                            ||||||||||||||||
                         ${currentSparkle}  ||||||||||||||||  ${currentSparkle}
                            ||||||||||||||||
                            '================`

  return (
    <div className="text-center mb-6">
      <div className="onion-breathe">
        <pre className="onion-pulse onion-layers text-sm leading-none font-mono">
          {onionArt}
        </pre>
      </div>
    </div>
  );
}