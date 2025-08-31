export default function SimpleOnion() {
  const onionArt = `
                     .-"-.
                   .'     '.
                  /         \\
                 |    ___    |
                 |   (   )   |
                 |    ---    |
                  \\         /
                   '.     .'
                   .-'---'-.
                  /         \\
                 |     o     |
                 |           |
                  \\         /
                   '.     .'
                   .-'---'-.
                  /         \\
                 |     o     |
                 |           |
                  \\         /
                   '.     .'
                   .-'---'-.
                  /         \\
                 |     o     |
                 |           |
                  \\         /
                   '.     .'
                     '---'
                      |||
                      |||
                    .-'''-. 
                   (       )
                    '-----'`;

  return (
    <div className="text-center">
      <pre className="text-green-400 text-sm font-mono leading-tight">
        {onionArt}
      </pre>
    </div>
  );
}