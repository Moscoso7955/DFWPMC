import type { CSSProperties } from "react";
import HomepageNewsletter from "./HomepageNewsletter";

// Reuse the original photographs and ornaments in separate image windows.
// All page copy and layouts are native elements; crop coordinates are source pixels.
const artwork = {
  landmark: "/assets/holding/public-market-historic-landmark.png",
  culture: "/assets/holding/public-market-cultural-hub.png",
  history: "/assets/holding/public-market-original-glory.png",
};

type PhotoWindowProps = {
  src: string;
  source: [number, number];
  crop: [number, number, number, number];
  alt: string;
  className?: string;
};

function PhotoWindow({ src, source, crop, alt, className = "" }: PhotoWindowProps) {
  const [x, y, width, height] = crop;
  const imageStyle: CSSProperties = {
    width: `${(source[0] / width) * 100}%`,
    height: `${(source[1] / height) * 100}%`,
    left: `${(-x / width) * 100}%`,
    top: `${(-y / height) * 100}%`,
  };
  return (
    <div className={`pm-photo-window ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
      <img src={src} width={source[0]} height={source[1]} style={imageStyle} alt={alt} loading="lazy" />
    </div>
  );
}

export default function HomepageSections() {
  return (
    <>
      <section className="pm-editorial pm-landmark" id="landmark" aria-labelledby="landmark-title">
        <div className="pm-editorial-inner">
          <div className="pm-photo-collage pm-landmark-collage">
            <PhotoWindow src={artwork.landmark} source={[2058, 1314]} crop={[62, 181, 630, 955]}
              alt="The restored Public Market tower and its historic entrance" className="pm-landmark-photo" />
            <PhotoWindow src={artwork.landmark} source={[2058, 1314]} crop={[551, 472, 467, 581]}
              alt="The neighboring Harden apartments beside the Public Market" className="pm-landmark-detail" />
            <PhotoWindow src={artwork.landmark} source={[2058, 1314]} crop={[630, 235, 145, 145]}
              alt="" className="pm-landmark-ornament" />
          </div>
          <div className="pm-editorial-copy">
            <h2 id="landmark-title">A historic<br /> landmark<br /> reimagined</h2>
            <p>The Fort Worth Public Market is rising again as a vibrant destination that celebrates community,
              culture, and culinary creativity. This meticulously restored historic building honors its storied
              past while welcoming a dynamic future that benefits all of Fort Worth.</p>
          </div>
        </div>
      </section>
      <section className="pm-history" aria-labelledby="history-title">
        <h2 className="sr-only" id="history-title">A gathering place for the community</h2>
        <p>In its original glory days, the Public Market was <span>a gathering place for the community,</span> providing
          farmers with an ideal location to sell their goods and shoppers a mecca to find all they could desire.</p>
        <PhotoWindow src={artwork.history} source={[2050, 1034]} crop={[974, 808, 105, 105]}
          alt="" className="pm-history-ornament" />
      </section>
      <section className="pm-editorial pm-culture" id="concepts" aria-labelledby="culture-title">
        <div className="pm-editorial-inner">
          <div className="pm-photo-collage pm-culture-collage">
            <PhotoWindow src={artwork.culture} source={[2052, 1564]} crop={[62, 293, 793, 533]}
              alt="Architectural rendering of the Public Market dining hall" className="pm-culture-photo" />
            <PhotoWindow src={artwork.culture} source={[2052, 1564]} crop={[468, 784, 549, 348]}
              alt="Architectural rendering of the Public Market café and goods counter" className="pm-culture-detail" />
            <PhotoWindow src={artwork.culture} source={[2052, 1564]} crop={[256, 787, 164, 164]}
              alt="" className="pm-culture-ornament" />
          </div>
          <div className="pm-editorial-copy">
            <h2 id="culture-title">A cultural &amp;<br /> culinary hub in<br /> the heart of<br /> the city</h2>
            <p>We’re thrilled to be working with Chef Jenna Kinard and her partners on a collection of inspired
              food and beverage concepts that will bring new energy to this historic space. These concepts are
              thoughtfully designed to honor the legacy of the Public Market while delivering fresh, elevated experiences.</p>
            <ul className="pm-concept-list">
              <li><a href="/madrone">Madrone</a> — An upscale dining destination featuring seasonal, locally sourced ingredients.</li>
              <li><a href="/willow">Willow</a> — A sophisticated cocktail bar and lounge offering elevated craft beverages.</li>
              <li><a href="/publicmarketcafe">Public Market Café &amp; Goods</a> — Serving freshly baked treats, coffee, and locally made products.</li>
            </ul>
          </div>
        </div>
      </section>
      <HomepageNewsletter />
      <footer className="pm-home-footer">
        <p>The Public Market · Fort Worth, Texas</p>
        <nav aria-label="Footer"><a href="/visit">Location</a><a href="#page-top">Back to top</a></nav>
      </footer>
    </>
  );
}
