export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ENTRAIN Studio</title>
      </head>
      <body>
        <div className="wrap">
          <nav className="nav">
            <a className="brand" href="/">
              ENTRAIN<b>·studio</b>
            </a>
            <div className="navlinks">
              <a href="/soundtracks">Soundtracks</a>
              <a href="/studio">Create</a>
              <a href="/library">Library</a>
              <a href="/creator">Account</a>
              <a href="/admin">Admin</a>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
