export const BASE_STYLE = `
  :host { --vc-accent: #ea0029; --vc-ok: var(--success-color, #43a047); --vc-warn: var(--warning-color, #ffa600);
          --vc-crit: var(--error-color, #db4437); --vc-idle: var(--secondary-text-color, #9e9e9e); --vc-active: var(--info-color, #039be5);
          /* Text in a state or brand color is mixed with the text color (darker on a light theme, lighter on a dark
             one) so that it reads at 4.5:1 at least; dots, bars and icons keep the plain color. */
          --vc-accent-text: color-mix(in srgb, var(--vc-accent) 50%, var(--primary-text-color)); }
  /* Container queries below follow the width the card is given (Sections view columns, mini card). */
  ha-card { overflow: hidden; container-type: inline-size; }
  /* A size container has no width of its own content: in a parent that sizes to its content (an inline-block, a grid
     "auto" column of layout-card, button-card…) the card would fall to its borders. This empty, zero-height grid gives
     the card a natural (max-content) width of --vc-natural-width without any minimum (its min-content width is 0): in
     a "1fr 1fr" grid or a flex row, wrapped in a <div> or not, the card still shrinks to its track. A min-width on the
     host or an intrinsic size on ha-card would be a minimum, and the card would overflow there on a phone. */
  :host { display: block; min-width: 0; --vc-natural-width: 360px; }
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, var(--vc-natural-width)); height: 0; }
  .icon { width: 18px; height: 18px; fill: currentColor; flex: none; }
  .muted { color: var(--secondary-text-color); }
  .clickable { cursor: pointer; }
  [role="button"]:focus-visible { outline: 2px solid var(--primary-color, var(--vc-accent)); outline-offset: 2px; border-radius: 4px; }
  :host([pointer]) :focus-visible { outline: none; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
  .ok { --c: var(--vc-ok); } .warn { --c: var(--vc-warn); } .crit { --c: var(--vc-crit); } .idle { --c: var(--vc-idle); } .active { --c: var(--vc-active); }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c, var(--vc-ok)); flex: none; display: inline-block; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap;
          background: color-mix(in srgb, var(--c, var(--vc-ok)) 15%, transparent); color: color-mix(in srgb, var(--c, var(--vc-ok)) 50%, var(--primary-text-color));
          flex: 0 1 auto; min-width: 0; max-width: 50%; overflow: hidden; box-sizing: border-box; }
  .chip-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar { height: 4px; border-radius: 3px; background: var(--divider-color, rgba(127,127,127,.25)); overflow: hidden; }
  .bar > div { height: 100%; border-radius: 3px; background: var(--c, var(--vc-ok)); transition: width .6s ease; }
  .header { display: flex; align-items: center; gap: 10px; padding: 12px 12px 0; }
  .logo { width: 40px; height: 40px; object-fit: contain; flex: none; }
  a.logo-link { display: flex; flex: none; }
  .type-icon { position: relative; width: 40px; height: 40px; border-radius: 50%; align-items: center; justify-content: center;
               --vc-tint: var(--c, var(--vc-idle)); background: color-mix(in srgb, var(--vc-tint) 16%, transparent); transition: background-color .3s ease; }
  /* The icon's color always tells the device's state: running (cleaning, returning, washing…) in the state color,
     at rest (docked, charging, idle, off) neutral grey, a warning amber, an error red. State colors are mixed with
     the text color for contrast, like the chips. */
  .type-icon.ok { --c: var(--vc-idle); }
  .type-icon.active { --c: var(--state-vacuum-active-color, var(--vc-active)); }
  .type-icon .icon.type { width: 24px; height: 24px; fill: color-mix(in srgb, var(--vc-tint) 60%, var(--primary-text-color)); transition: fill .3s ease; }
  @media (prefers-reduced-motion: reduce) { .type-icon, .type-icon .icon.type { transition: none; } }
  .type-icon .logo { position: absolute; right: -4px; bottom: -4px; width: 18px; height: 18px; border-radius: 5px;
                     background: var(--card-background-color, #fff);
                     box-shadow: 0 0 0 1px var(--divider-color, rgba(0,0,0,.12)), 0 0 0 3px var(--card-background-color, #fff); }
  /* The title takes the room the chip leaves (flex-basis 0: a long name does not push the chip into its ellipsis)
     and keeps about four characters and its ellipsis; the chip shrinks only when even that does not fit. */
  .titles { flex: 1 1 0; min-width: 0; font-size: 16px; }
  :host([hide-title]) .titles .name, :host([hide-subtitle]) .titles > .sub { display: none; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .warning { padding: 16px; color: color-mix(in srgb, var(--vc-warn) 50%, var(--primary-text-color)); }
  .picture { flex: none; display: flex; align-items: center; justify-content: center; }
  .picture img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .line span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .alert-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: color-mix(in srgb, var(--c, var(--vc-crit)) 50%, var(--primary-text-color)); }
  .alert-line .icon { width: 16px; height: 16px; color: var(--c, var(--vc-crit)); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; cursor: pointer; font: inherit; font-size: 13px;
         font-weight: 500; padding: 6px 12px; border-radius: 18px; background: var(--secondary-background-color, rgba(127,127,127,.12));
         color: var(--primary-text-color); min-width: 0; }
  .btn span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .btn:not(.disabled):hover { background: color-mix(in srgb, var(--vc-accent) 12%, var(--secondary-background-color, rgba(127,127,127,.12))); }
  .btn.primary { background: color-mix(in srgb, var(--vc-accent) 16%, transparent); color: var(--vc-accent-text); }
  .btn.primary .icon { color: var(--vc-accent); }
  .btn.primary:not(.disabled):hover { background: color-mix(in srgb, var(--vc-accent) 24%, transparent); }
  .btn .icon { width: 18px; height: 18px; }
  .btn.round { width: 36px; height: 36px; padding: 0; border-radius: 50%; }
  .btn.disabled { opacity: .45; cursor: default; }
  .rooms { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px;
           border: 1px solid var(--divider-color, rgba(127,127,127,.25)); }
  .rooms-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; }
  .rooms-title .icon { width: 18px; height: 18px; color: var(--vc-accent); }
  .rooms-msg { font-size: 13px; color: var(--secondary-text-color); }
  .room-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .room { font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 16px; cursor: pointer; color: var(--primary-text-color);
          background: var(--secondary-background-color, rgba(127,127,127,.12)); border: 1px solid transparent; }
  .room.on { background: color-mix(in srgb, var(--vc-accent) 16%, transparent); color: var(--vc-accent-text); font-weight: 500; }
  .room.on:hover { background: color-mix(in srgb, var(--vc-accent) 24%, transparent); }
  .room.all { color: var(--secondary-text-color); }
  .room.all.on { color: var(--vc-accent-text); }
  .passes { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .passes-label { font-size: 13px; color: var(--secondary-text-color); margin-right: 4px; }
  .rooms-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
  .zoom { all: unset; flex: none; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom .icon { width: 16px; height: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--vc-idle) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible { outline: 2px solid var(--primary-color, var(--vc-accent)); outline-offset: 1px; }
  /* The status pill, in every header: on the title row right after the title only when the whole title and the pill's
     whole label fit there; otherwise on its own line under the subtitle, cut to one line; its dot alone, beside the
     title, when the banner has no room left above its ground strip, or on a card of 200 px or less. Decided by
     measurement (see _fitPill), so that every language and every width gets it right. */
  .titles .trow { display: flex; align-items: center; gap: 8px; min-width: 0; width: 100%; }
  .titles .trow > .name { flex: 0 1 auto; min-width: 0; }
  .titles .trow > .chip { flex: none; max-width: none; margin: 0; align-self: center; }
  .titles.below { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
  .titles.below > * { max-width: 100%; }
  .titles.below .trow { display: contents; }
  .titles.below .trow > .name { max-width: 100%; }
  .titles.below .trow > .chip { order: 9; max-width: 100%; margin-top: 2px; align-self: flex-start; }
  /* In the banner, a pill on its own line may run over the picture, up to the banner's edge. */
  .banner .titles.below .trow > .chip { max-width: none; }
  .titles.below > :is(.sub, .line2) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .titles.dotonly .trow > .chip { padding: 4px; } .titles.dotonly .trow > .chip .chip-text { display: none; }
  @container (max-width: 200px) { .titles .trow > .chip { padding: 4px; } .titles .trow > .chip .chip-text { display: none; } }
  /* The 40 px type icon keeps its size at every width: the name gives way (ellipsis) instead. */
  @container (max-width: 200px) {
    .header { gap: 6px; }
  }
`;

// In-card confirmation popup, as in ha-system-monitor-card and ha-iptv: a backdrop over the card with a
// small dialog at the top of the card, so that it stays in view when the card is long.
export const DIALOG_STYLE = `
  ha-card.dialog-open { position: relative; min-height: 160px; }
  .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-start; justify-content: center;
              padding-top: 12px; box-sizing: border-box; z-index: 9; border-radius: inherit; }
  .modal { background: var(--card-background-color, #1c1c1c); color: var(--primary-text-color); width: min(92%, 340px); max-height: calc(100% - 24px);
           box-sizing: border-box; border-radius: 14px; padding: 16px; box-shadow: 0 8px 30px rgba(0,0,0,.4); display: flex; flex-direction: column; gap: 12px; }
  .modal .msg { font-size: 14px; line-height: 1.4; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
`;
