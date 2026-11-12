"use client";

import { useEffect } from "react";

// "What does this button do?" Hover a button (computer) or press and hold
// it (phone) and a short explanation pops up. A hold shows the tip
// instead of pressing the button; a normal tap still works.
//
// Tips are matched by the button's label, so new buttons with a familiar
// label ("Delete", "Save") get one for free. A `data-tip` attribute on any
// element overrides the list.

type Tip = { re?: RegExp; sel?: string; tip: string };

const TIPS: Tip[] = [
  // ----- Admin bar
  { sel: ".admin-bar-menu-button", tip: "Every admin section, page shortcuts, who's signed in and Log out." },
  { sel: ".admin-bar-brand", tip: "Back to your admin home." },
  { sel: ".admin-bar-links a, .admin-bar-menu a", re: /^site$|^home page$/, tip: "Edit the public website. Changes stay in a draft until you publish." },
  { re: /^ticketing$/, tip: "Ticketed events: tiers, promo codes, orders and refunds." },
  { sel: ".admin-bar a, .admin-bar-menu a", re: /^photos$/, tip: "Review the photos contributors upload for each night and choose what goes on the site." },
  { re: /^playbook$/, tip: "Plans that count down to a big night: tasks, budget, supplies and reminder emails." },
  { sel: ".admin-bar a, .admin-bar-menu a", re: /^contacts$|^vendors$|^vendor contacts$/, tip: "Vendors and helpers (lighting, florist, DJ) you can attach to plays and tasks." },
  { re: /^hours$|^operating hours$|^set operating hours$/, tip: "Your regular opening hours. Calendar events outside them are hidden." },
  { re: /^analytics$/, tip: "Site visits, menu clicks and links to the sales reports." },
  { sel: ".admin-bar a, .admin-bar-menu a", re: /^settings$|^people$/, tip: "Who can sign in, their roles, and who gets the update emails." },
  { re: /^people$/, tip: "Who's on the team: sign-in, roles and update emails (in Settings)." },
  { re: /^contacts$/, tip: "Vendors and helpers you can attach to plays and tasks." },
  { re: /^roles access$/, tip: "Choose which parts of admin each role can see." },
  { re: /^publish changes$/, tip: "Puts every draft change live on the website for guests." },
  { re: /^all live$/, tip: "Nothing to publish: the live site already matches your edits." },
  { re: /^discard unpublished changes$/, tip: "Throws away all draft edits and goes back to what's live. Asks first." },
  { re: /^log out$/, tip: "Signs you out on this device." },
  { re: /^form submissions$|^view submissions$/, tip: "Messages sent through the website's contact form." },
  { re: /^mailing list$|^view mailing list$/, tip: "Everyone who signed up for emails, with an export." },
  { re: /^customers$|^view customers$/, tip: "Ticket buyers and what they bought, from Stripe." },
  { re: /^sales by source$/, tip: "Which ads, posts and links led to ticket sales." },
  { re: /^calendar$|^manage calendar$/, tip: "The public calendar: add, move or close days and events." },
  { re: /^book an event$/, tip: "The private-events inquiry page." },
  { re: /^upload photos$/, tip: "Upload a night's photos for review." },
  { re: /^door$|^open blackbook$/, tip: "The door app: scan tickets and check the VIP and banned lists." },
  { re: /^photo events$/, tip: "Costume contests and other photo events guests enter and vote on." },

  // ----- Pickers and cards
  { sel: ".phoebe-date-trigger", tip: "Pick a date from the calendar." },
  { sel: ".phoebe-time-clear", tip: "Clear this time." },
  { sel: ".ticketing-portal-event a", tip: "Open this event to edit it, see orders and sales." },
  { re: /^import a template$/, tip: "Load a play someone exported from another venue." },

  // ----- Site preview editing
  { sel: ".admin-edit-hotspot", tip: "Change this part of the page. It goes into the draft until you publish." },
  { re: /^save draft$/, tip: "Saves your change to the draft. Publish to put it live." },

  // ----- Calendar
  { sel: ".admin-day-status button", re: /regular hours/, tip: "Follow your regular opening hours on this date." },
  { sel: ".admin-day-status button", re: /^open$/, tip: "Open this date: every event shows, even outside regular hours." },
  { sel: ".admin-day-status button", re: /closed/, tip: "Closed this date: the calendar says “We are closed today” instead of events." },
  { re: /^add event$/, tip: "Add an event to this date." },
  { re: /^move event$/, tip: "Move this event to another date or time." },
  { re: /^save event$/, tip: "Adds the event to the draft calendar." },
  { re: /^save move$/, tip: "Moves the event in the draft calendar." },
  { re: /^cancel move$/, tip: "Leave the event where it is." },
  { re: /^yes delete$/, tip: "Removes the event from the draft calendar." },
  { re: /^edit it in ticketing$/, tip: "This event comes from Ticketing; change it there." },

  // ----- Hours
  { sel: ".admin-hours-toggle", tip: "Tick if you're open this day; set the times next to it." },

  // ----- Photos
  { re: /^review$/, tip: "Open this night to pass or fail its photos." },
  { sel: ".admin-photos-live-links a", re: /^view$/, tip: "Open this night's public photo page in a new tab." },
  { sel: ".admin-photos-live-links a", re: /^edit$/, tip: "Open this night to change which photos are live." },
  { re: /^reopen review$/, tip: "Takes the night off the site so it can be reviewed again. Passes, fails and stars are kept." },
  { re: /^unpublish$/, tip: "Hides this night from the site without changing its review. Publish again brings it back." },
  { re: /^publish again$/, tip: "Puts this hidden night back on the site." },
  { re: /^add contributor$/, tip: "Creates an upload login for a photographer." },
  { re: /^new password$/, tip: "Makes a new upload password for this contributor and shows it once." },
  { re: /^start reviewing|^review again one at a time$/, tip: "Go through the photos one at a time: right for yes, left for no." },
  { re: /^delete \d+ failed photo/, tip: "Deletes every photo marked Fail, for good. Asks first." },
  { re: /^delete this night$/, tip: "Deletes this night and all its photos, for good. Asks first." },
  { re: /^pass( p)?$|^yes$/, tip: "Show this photo on the site." },
  { re: /^fail( f)?$|^no$/, tip: "Keep this photo off the site." },
  { re: /^star( s)?$/, tip: "A favorite: starred photos lead the night, and a star counts as a yes." },
  { sel: ".admin-review-filters button", tip: "Show only these photos." },
  { re: /^mark review done$/, tip: "Finishes the review and puts the night live with the photos that passed." },
  { re: /^undo( last)?$/, tip: "Takes back your last swipe." },
  { re: /^grid$|^back to the grid$/, tip: "Back to all the photos at once." },

  // ----- Photo events
  { re: /^approve$/, tip: "Shows this held entry in the contest." },
  { sel: ".admin-pe-held button, .admin-pe-leaders button", re: /^hide$/, tip: "Takes this entry out of the contest. You can bring it back." },
  { sel: ".admin-pe-held button, .admin-pe-leaders button", re: /^remove$/, tip: "Deletes this entry and its photo for good. Its voters can vote again." },
  { re: /^download qr$/, tip: "Downloads the QR code guests scan to enter." },
  { re: /^open guest page$/, tip: "Opens the contest page guests see." },
  { re: /^full photo$/, tip: "Opens the full-size photo." },
  { re: /^open its review$/, tip: "Go to this event's photos in People of Phoebe." },

  // ----- Playbook
  { re: /^new play$/, tip: "Start a new plan, from scratch or from a template." },
  { re: /^add line$/, tip: "Adds a line to the budget." },
  { re: /^remove line$/, tip: "Deletes this budget line. Asks first." },
  { re: /^add item$/, tip: "Adds something to buy or bring." },
  { sel: ".pb-inline-add button", re: /^add$/, tip: "Adds this to the plan." },
  { re: /^save details$/, tip: "Saves the play's name, dates, owner and goal." },
  { re: /^export file/, tip: "Downloads this play as a file another venue can import." },
  { re: /^copy to next year$/, tip: "Makes a copy of this play for next year, with the same tasks and budget." },
  { re: /^mark done$/, tip: "Tick off this task." },
  { re: /^mark not done$/, tip: "Un-tick this task." },
  { sel: ".pb-filters button", tip: "Show only this team's tasks." },
  { sel: ".pb-filters label", tip: "Hide tasks that are already done." },
  { re: /^preview$/, tip: "Shows this email exactly as it will be sent." },
  { re: /^edit people$/, tip: "Choose who gets this play's emails." },
  { re: /^buy at$/, tip: "Opens the shop's page in a new tab." },

  // ----- People and access
  { re: /^send invite$/, tip: "Emails them a link to sign in with Google." },
  { re: /^resend invite$/, tip: "Sends the sign-in link again (the old one stops working)." },
  { re: /^cancel invite$/, tip: "Turns off their invite link so it can't be used." },
  { re: /^turn off$/, tip: "Stops this person signing in and signs them out everywhere. Turn on brings them back." },
  { re: /^turn on$/, tip: "Lets this person sign in again." },
  { sel: ".access-person-actions button", re: /^remove$/, tip: "Takes this person off the list and signs them out. Asks first." },
  { sel: ".access-chip", tip: "Turn this role on or off for this person." },
  { sel: ".access-alerts", tip: "Emails them when new photos are uploaded and waiting for review." },
  { sel: ".access-updates", tip: "Sends them the 8 AM email about new features on the site." },
  { re: /^add no sign in$/, tip: "Adds someone who can own Playbook tasks but can't sign in." },
  { re: /^add a role$/, tip: "Create a new role, then tick what it can see." },
  { sel: ".access-grid input, .access-grid label", tip: "Lets this role see this part of admin." },

  // ----- Contacts
  { re: /^add contact$|^new contact$/, tip: "Add a vendor or helper with their phone, email and notes." },
  { re: /^email$/, tip: "Starts an email to this contact." },
  { sel: ".admin-submission-reply", tip: "Starts an email reply to this person." },
  { re: /^call$/, tip: "Calls this contact." },

  // ----- Customers and reports
  { re: /^export csv$/, tip: "Downloads this list as a spreadsheet file." },
  { re: /^refresh from stripe$/, tip: "Pulls the latest customers and orders from Stripe." },
  { re: /^order in ticketing$/, tip: "Opens this order in Ticketing." },
  { re: /^stripe receipt$/, tip: "Opens Stripe's receipt for this payment." },
  { re: /^last click$/, tip: "Credits each sale to the last link the buyer clicked." },
  { re: /^first click$/, tip: "Credits each sale to the first link that brought the buyer in." },
  { re: /^open vercel analytics$/, tip: "Opens the detailed visitor stats." },

  // ----- Ticketing
  { re: /^events$/, tip: "All ticketed events, upcoming first." },
  { re: /^history$/, tip: "Past events and what they sold." },
  { re: /^quickbooks$|^connect to quickbooks$/, tip: "Send ticket sales to QuickBooks automatically." },
  { re: /^disconnect$/, tip: "Stops sending sales to QuickBooks." },
  { re: /^reconnect$/, tip: "Signs in to QuickBooks again so sales keep flowing." },
  { re: /^new event$|^create your first event$/, tip: "Start a new ticketed event (it's a draft until you put it on sale)." },
  { re: /^orders$/, tip: "Everyone who bought tickets for this event." },
  { re: /^duplicate$/, tip: "Makes a copy of this event, with the same tiers, to edit." },
  { re: /^release (stuck holds|held tickets)$/, tip: "Frees tickets held by buyers who left checkout without paying, so others can buy them." },
  { sel: ".ticketing-portal-header-row button", re: /^delete$/, tip: "Deletes this event. Asks first." },
  { re: /^issue comps$/, tip: "Gives free tickets to guests you choose." },
  { re: /^add tier$/, tip: "Adds a ticket type, like GA or VIP." },
  { sel: ".ticketing-tier button", re: /^edit$/, tip: "Change this ticket type's price, quantity or sale dates." },
  { sel: ".ticketing-tier button", re: /^delete$/, tip: "Deletes this ticket type. Only possible before any are sold." },
  { re: /^add promo$/, tip: "Adds a discount code." },
  { re: /^guest list csv$/, tip: "Downloads the door list for this event." },
  { re: /^full refund$/, tip: "Refunds the whole order to the buyer's card." },
  { re: /refund/, tip: "Refunds part of this order to the buyer's card." },
  { re: /^keep event$/, tip: "Don't delete; go back." },
  { re: /^apply$/, tip: "Show results for these dates." },

  // ----- Door app
  { re: /^scan tickets$/, tip: "Scan guests' ticket QR codes at the door." },
  { re: /^vip banned$|^vips$|^banned$/, tip: "The VIP and banned lists." },
  { re: /^admin$/, tip: "Back to admin." },

  // ----- Upload
  { re: /^upload \d* ?photos?$/, tip: "Sends these photos for review." },

  // ----- Everyday buttons
  { re: /^edit$/, tip: "Change this." },
  { re: /^delete$|^remove$/, tip: "Deletes this. Asks first where it can't be undone." },
  { re: /^save$/, tip: "Saves your changes." },
  { re: /^cancel$|^close|^x$/, tip: "Close without saving." },
  { re: /^done$|^got it$/, tip: "Close this." },
];

const TARGETS = 'button, a[href], [role="tab"], .access-updates, .access-grid label, .pb-filters label, .admin-hours-toggle';

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function tipFor(el: HTMLElement): string | null {
  const own = el.closest<HTMLElement>("[data-tip]")?.dataset.tip;
  if (own) return own;
  if (el.closest(".admin-modal-close") && !el.textContent?.trim()) return "Close without saving.";
  const label = norm(el.getAttribute("aria-label") || el.textContent || "");
  for (const t of TIPS) {
    if (t.sel && !el.matches(t.sel) && !el.closest(t.sel)) continue;
    if (t.re && !t.re.test(label)) continue;
    return t.tip;
  }
  return null;
}

export default function AdminTips() {
  useEffect(() => {
    const bubble = document.createElement("div");
    bubble.className = "admin-tip";
    bubble.setAttribute("role", "tooltip");
    bubble.hidden = true;
    document.body.append(bubble);

    let timer: number | undefined;
    let shownFor: HTMLElement | null = null;
    let swallowClick = 0;

    const hide = () => {
      window.clearTimeout(timer);
      bubble.hidden = true;
      shownFor = null;
    };
    const show = (el: HTMLElement, text: string) => {
      bubble.textContent = text;
      bubble.hidden = false;
      const r = el.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      const edge = 8;
      const left = Math.max(edge, Math.min(r.left + r.width / 2 - b.width / 2, window.innerWidth - b.width - edge));
      const above = r.top - b.height - 8;
      const top = above >= edge ? above : Math.min(r.bottom + 8, window.innerHeight - b.height - edge);
      bubble.style.left = `${left}px`;
      bubble.style.top = `${top}px`;
      shownFor = el;
    };
    const targetOf = (e: Event) => (e.target as Element | null)?.closest?.(TARGETS) as HTMLElement | null;

    // Computer: hover (or keyboard focus) for a moment.
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = targetOf(e);
      if (!el || el === shownFor) return;
      hide();
      const text = tipFor(el);
      if (text) timer = window.setTimeout(() => show(el, text), 450);
    };
    const onOut = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = targetOf(e);
      const to = (e.relatedTarget as Element | null)?.closest?.(TARGETS);
      if (el && to !== el) hide();
    };
    const onFocus = (e: FocusEvent) => {
      const el = targetOf(e);
      if (!el || !el.matches(":focus-visible")) return;
      const text = tipFor(el);
      hide();
      if (text) timer = window.setTimeout(() => show(el, text), 600);
    };

    // Phone: press and hold. Showing the tip cancels that press.
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const el = targetOf(e);
      hide();
      if (!el) return;
      const text = tipFor(el);
      if (!text) return;
      timer = window.setTimeout(() => {
        show(el, text);
        swallowClick = Date.now();
        navigator.vibrate?.(10);
      }, 500);
    };
    const onUp = () => {
      window.clearTimeout(timer);
      if (shownFor) window.setTimeout(hide, 2200);
    };
    const onClick = (e: MouseEvent) => {
      if (swallowClick && Date.now() - swallowClick < 1500) {
        e.preventDefault();
        e.stopPropagation();
        swallowClick = 0;
      }
    };
    const onMenu = (e: Event) => {
      if (shownFor || swallowClick) e.preventDefault();
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", hide);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("click", onClick, true);
    document.addEventListener("contextmenu", onMenu);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("scroll", hide, true);
    document.addEventListener("keydown", onKey);
    return () => {
      hide();
      bubble.remove();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("contextmenu", onMenu);
      window.removeEventListener("scroll", hide, true);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
