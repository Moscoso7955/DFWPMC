const directionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=Fort+Worth+Public+Market%2C+1400+Henderson+St%2C+Fort+Worth%2C+TX+76102";

export default function HomepageSections() {
  return (
    <>
      <section className="pm-editorial pm-landmark" id="landmark" aria-labelledby="landmark-title">
        <div className="pm-editorial-inner">
          <div className="pm-editorial-photo pm-landmark-photo">
            <img
              src="/assets/images/public-market-historic-hero.png"
              width={1214}
              height={1554}
              alt="Historic photograph of the Public Market entrance, tower, and surrounding storefronts"
              loading="lazy"
            />
          </div>
          <div className="pm-editorial-copy">
            <h2 id="landmark-title">A Fort Worth landmark,<br /> a new chapter.</h2>
            <p>Together with Chef Jenna Kinard and her partners, we’re opening the doors to three distinct
              food and drink concepts within the historic Public Market. Each brings its own character
              to the building, connected by a love for this city and the people who give it heart.</p>
          </div>
        </div>
      </section>

      <section className="pm-history" aria-labelledby="history-title">
        <h2 className="sr-only" id="history-title">A gathering place for the community</h2>
        <p>In its original glory days, the Public Market was a gathering place for the community, providing
          farmers with an ideal location to sell their goods and shoppers a mecca to find all they could desire.</p>
      </section>

      <section className="pm-editorial pm-culture" id="concepts" aria-labelledby="culture-title">
        <div className="pm-editorial-inner">
          <div className="pm-editorial-photo pm-culture-photo">
            <img
              src="/assets/images/public-market-historic-interior.jpg"
              width={2320}
              height={1783}
              alt="The Public Market’s original interior with its open hall, upper balcony, and skylights"
              loading="lazy"
            />
          </div>
          <div className="pm-editorial-copy">
            <h2 id="culture-title">A cultural &amp; culinary hub<br /> in the heart of the city</h2>
            <ul className="pm-concept-list">
              <li>
                <h3><a href="/madrone">Madrone</a></h3>
                <p>Fine Texas dining that celebrates the region’s ingredients, the rhythm of the seasons,
                  and the pleasure of a memorable meal.</p>
              </li>
              <li>
                <h3><a href="/willow">Willow</a></h3>
                <p>Thoughtfully crafted cocktails and a playfully indulgent food menu in an intimate lounge
                  setting, made for an evening out or one more round.</p>
              </li>
              <li>
                <h3><a href="/publicmarketcafe">Public Market Café &amp; Goods</a></h3>
                <p>Provisions for the people. Fair-trade coffee, nourishing meals, weekend brunch, pantry
                  staples, and goods from Fort Worth makers, with a living plant wall offering fresh herbs
                  and produce. Made for everyday life and whatever the day holds.</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="pm-location" id="location" aria-labelledby="location-title">
        <div className="pm-location-inner">
          <div className="pm-location-copy">
            <h2 id="location-title">Find us in Fort Worth</h2>
            <address>1400 Henderson Street<br />Fort Worth, Texas 76102</address>
            <a className="pm-directions-link" href={directionsUrl} target="_blank" rel="noopener noreferrer">
              Get directions<span className="sr-only"> in Google Maps, opens in a new tab</span>
            </a>
          </div>
          <iframe
            className="pm-location-map"
            title="Map showing the Public Market at 1400 Henderson Street in Fort Worth"
            src="https://maps.google.com/maps?q=Fort+Worth+Public+Market%2C+1400+Henderson+St%2C+Fort+Worth%2C+TX+76102&z=14&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>

      <footer className="pm-home-footer">
        <p>The Public Market · Fort Worth, Texas</p>
        <nav aria-label="Footer">
          <a href="#location">Location</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/accessibility">Accessibility</a>
          <a href="#page-top">Back to top</a>
        </nav>
      </footer>
    </>
  );
}
