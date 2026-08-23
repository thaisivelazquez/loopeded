// ====================================================
// SAVE TO: frontend/src/useLoopedApp.js
// ====================================================
import { useEffect, useRef, useState } from 'react';
import { fmtName } from './lib/data.js';
import { nowHour, modeForHour, gradientForMode, fmtTime, dayLabel, clockLine as clockLineFor, hourToClockValue, clockValueToHour } from './lib/time.js';
import { api } from './lib/api.js';
import { COUNTRY_CODES } from './lib/countryCodes.js';

const ACCENT = '#ff8a5c';
const RESEND_COOLDOWN_SECONDS = 60;
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Straight-line ("as the crow flies") distance in miles between two
// lat/lng points, via the haversine formula. Good enough for a rough
// "X mi away" label — not turn-by-turn walking/driving distance.
function milesBetween(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(miles) {
  if (miles < 0.1) return 'just around the corner';
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
}

function emptyComposerFields() {
  return {
    cTitle: '', cPlace: '', cNote: '', cDate: '0', cTime: '',
    cEndTime: '', cNoEndTime: false,
    cSpots: '0', cEmoji: '', cVisibility: 'outer', editingId: null
  };
}

function initialState() {
  return {
    view: 'loading', // 'loading' | 'onboarding' | 'today' | 'friends' | 'pings' | 'you'
    name: '', last: '', phone: '', bio: '',
    onboarded: false,
    // Onboarding now branches on whether the phone number already has an
    // account (checked via api.checkPhoneExists right after step 1):
    //   new number:      phone -> name -> verify -> friends
    //   existing number: phone -> verify -> (log straight in, no more screens)
    // obIsNewUser is null until that check resolves.
    obScreen: 'phone', // 'phone' | 'name' | 'verify' | 'friends'
    obIsNewUser: null,
    obFirst: '', obLast: '', obPhone: '', obCountry: '+1',
    obCode: '', codeError: '', sendingCode: false, verifying: false, resendCooldown: 0, resending: false,
    obSuggested: [], obAdded: [],
    friendsRaw: [],
    events: [],
    pingsRaw: [],
    composerOpen: false,
    ...emptyComposerFields(),
    toast: '',
    friendQuery: '', contactQuery: '', contactsLinked: false,
    skyOverride: 'auto',
    previewHour: null,
    detailId: null,
    statusFriendId: null,
    confirmRemoveId: null,
    confirmDeleteAccount: false,
    myCoords: null,
    nowTick: Date.now()
  };
}

export function useLoopedApp() {
  const [state, setStateRaw] = useState(initialState);
  const toastTimer = useRef(null);
  const cooldownTimer = useRef(null);

  function setState(patch) {
    setStateRaw(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }

  function toast(msg) {
    setState({ toast: msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setState({ toast: '' }), 2600);
  }
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);

  // ---------- viewer's own location, for "X mi away" on event cards ----------
  // Asked for once, quietly, after we know the person is signed in — never
  // blocks anything else in the app. If they deny the permission prompt, or
  // their browser doesn't support geolocation, we just stay with
  // "distance unknown" everywhere; nothing else in the app depends on this.
  useEffect(() => {
    if (!state.onboarded || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ myCoords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => {
        // denied, timed out, or unavailable — silently ignore
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }, [state.onboarded]);

  function startResendCooldown() {
    setState({ resendCooldown: RESEND_COOLDOWN_SECONDS });
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setStateRaw(prev => {
        const next = prev.resendCooldown - 1;
        if (next <= 0) clearInterval(cooldownTimer.current);
        return { ...prev, resendCooldown: Math.max(0, next) };
      });
    }, 1000);
  }

  // ---------- load session on mount + live clock ----------
  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setState({
          name: me.firstName, last: me.lastName || '', phone: me.phone || '', bio: me.bio || '',
          onboarded: true, view: 'today'
        });
        await loadBoard();
      } catch (e) {
        // Not signed in (no/invalid session cookie) — show onboarding.
        setState({ view: 'onboarding' });
      }
    })();
    const clock = setInterval(() => setState({ nowTick: Date.now() }), 30000);
    return () => clearInterval(clock);
  }, []);

  async function loadBoard() {
    try {
      const [friendsRaw, events, pingsRaw] = await Promise.all([api.friends(), api.events(), api.pings()]);
      // Defensive: if any of these ever comes back as something other than
      // an array (empty response body, unexpected shape, a transient
      // backend hiccup), fall back to [] rather than letting `undefined`
      // or `null` propagate into state — every screen in the app assumes
      // these are arrays and calls .map()/.filter() on them directly, so a
      // single bad response here was enough to white-screen the whole app.
      setState({
        friendsRaw: Array.isArray(friendsRaw) ? friendsRaw : [],
        events: Array.isArray(events) ? events : [],
        pingsRaw: Array.isArray(pingsRaw) ? pingsRaw : []
      });
    } catch (e) {
      toast("couldn't load your board — check your connection 📡");
    }
  }

  // ---------- background refresh, so new/updated events from friends show
  // up on their own instead of requiring a manual page reload ----------
  // Silent on purpose (no toast on failure) since this runs unattended —
  // a dropped poll shouldn't interrupt whatever the person is doing. Skips
  // the merge entirely while the composer is open or a post is mid-submit
  // so it can never stomp on text someone is actively typing.
  async function refreshEvents() {
    try {
      const events = await api.events();
      setStateRaw(prev => (prev.composerOpen ? prev : { ...prev, events }));
    } catch (e) {
      // ignore — next poll (or the next foreground/visibility refresh) will
      // pick it up
    }
  }

  useEffect(() => {
    if (!state.onboarded) return;
    const POLL_MS = 12000;
    const poll = setInterval(refreshEvents, POLL_MS);
    function onVisible() {
      if (document.visibilityState === 'visible') refreshEvents();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshEvents);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshEvents);
    };
  }, [state.onboarded]);

  // ---------- time & sky ----------
  const now = nowHour(new Date(state.nowTick));
  const mode = state.skyOverride !== 'auto' ? state.skyOverride : modeForHour(now);
  const bgGradient = gradientForMode(mode);

  // ---------- friends (from the API instead of hardcoded mock data) ----------
  function friends() {
    return (state.friendsRaw || []).map(f => ({ ...f, name: fmtName(f.first, f.last) }));
  }
  function friendById(id) {
    return friends().find(f => f.id === id);
  }

  // ---------- events (backend already merges "today" + "later this week" +
  // your own posts into one list, shaped like the old mock activity objects) ----------
  function findActivity(id) {
    return state.events.find(a => a.id === id);
  }
  function allToday() {
    return state.events.filter(a => !a.day);
  }
  function futureEvents() {
    return state.events.filter(a => !!a.day).sort((a, b) => (a.dayOffset - b.dayOffset) || (a.hour - b.hour));
  }

  function status(a) {
    if (a.day) return 'open';
    // a.dur is null for events posted with "no end time" — those never wrap.
    if (a.dur != null && now > a.hour + a.dur) return 'wrapped';
    if (now >= a.hour - 0.25) return 'now';
    return 'open';
  }

  // A friend counts as "live" if they're hosting or have joined something
  // that's happening right now — regardless of whether you were invited or
  // could see it. Only "today, happening now" counts; posted-for-later
  // plans don't make someone live yet.
  function currentActivityFor(friendId) {
    return state.events.find(a => {
      const involved = a.who === friendId || (a.joined || []).includes(friendId);
      return involved && status(a) === 'now';
    });
  }

  // ---------- optimistic local mutations, backed by real API calls ----------
  function patchEvent(id, patch) {
    setState(prev => ({
      events: prev.events.map(e => (e.id === id ? { ...e, ...(typeof patch === 'function' ? patch(e) : patch) } : e))
    }));
  }
  function removeEvent(id) {
    setState(prev => ({ events: prev.events.filter(e => e.id !== id) }));
  }

  async function toggleJoin(a) {
    const whoName = a.isYours ? 'you' : (friendById(a.who) ? friendById(a.who).name : a.who);
    if (a.youIn) {
      patchEvent(a.id, { youIn: false });
      toast('no worries, backed out quietly');
      try { await api.leaveEvent(a.id); } catch (e) { patchEvent(a.id, { youIn: true }); }
      return;
    }
    try {
      const res = await api.joinEvent(a.id);
      if (res.asked) {
        toast('asked ' + whoName + " to join — they'll decide 🙏");
      } else {
        patchEvent(a.id, { youIn: true });
        toast('going — ' + whoName + ' will be stoked 🎉');
      }
    } catch (e) {
      toast("couldn't join that one — try again 🙏");
    }
  }

  async function cancelEvent(a) {
    removeEvent(a.id);
    toast('called off — friends were told 💛');
    try { await api.cancelEvent(a.id); } catch (e) { await loadBoard(); }
  }

  // ================= derived view model =================
  const S = state;
  const name = S.name || 'you';
  const gname = name.toLowerCase();
  const isOnboarding = S.view === 'onboarding';
  const isLoading = S.view === 'loading';

  const greeting = mode === 'morning' ? 'good morning, ' + gname + ' ☀️'
    : mode === 'sunset' ? 'golden hour, ' + gname + ' 🌅'
    : 'night owl hours, ' + gname + ' 🌙';

  // The board's time slider previews other hours without touching real
  // event status (now/wrapped stays truthful) — it just dims cards outside
  // the selected window. Defaults to following the live clock until the
  // user drags it; SLIDER_MIN/MAX match the board's 8am–1am display range.
  const SLIDER_MIN = 8, SLIDER_MAX = 28;
  const previewActive = S.previewHour !== null;
  const previewValue = previewActive ? S.previewHour : now;

  const acts = allToday().map(a => {
    const st = status(a);
    const youIn = !!a.youIn;
    const joinedCount = a.joined.length + (youIn ? 1 : 0);
    const fr = friendById(a.who);
    const whoName = a.isYours ? 'you' : (fr ? fr.name : a.who);
    const wrapped = st === 'wrapped';
    const spotsLeft = a.spots ? a.spots - joinedCount : 0;
    const full = !!a.spots && spotsLeft <= 0 && !youIn;
    let joinText;
    if (wrapped) joinText = joinedCount ? joinedCount + ' went' : 'quiet one';
    else if (youIn) joinText = joinedCount === 1 ? 'going' : 'you + ' + (joinedCount - 1) + ' going';
    else if (full) joinText = 'full · ' + joinedCount + ' going';
    else if (joinedCount === 0) joinText = a.isYours ? 'no one yet' : 'be the first 👀';
    else joinText = joinedCount + ' in' + (a.spots && spotsLeft > 0 ? ' · ' + spotsLeft + ' spots left' : '');
    const statusLine = wrapped ? fmtTime(a.hour) + ' · wrapped'
      : st === 'now' ? 'happening now'
      : fmtTime(a.hour) + (a.hour >= 20 ? ' · tonight' : '');
    const baseOpacity = wrapped ? .55 : 1;
    const dimmedByPreview = previewActive && Math.abs(a.hour - previewValue) > 2.5;
    return {
      id: a.id, hour: a.hour,
      title: a.what + ' ' + a.emoji,
      whoLine: whoName + ' · 📍 ' + a.place,
      note: a.note || '',
      hasNote: !!a.note && !wrapped,
      isYours: !!a.isYours,
      wrapped,
      opacity: dimmedByPreview ? baseOpacity * 0.32 : baseOpacity,
      pulsing: st === 'now' && !dimmedByPreview,
      statusLine,
      statusColor: st === 'now' ? '#e0562a' : 'rgba(58,44,40,.5)',
      statusBold: st === 'now',
      showFooter: !wrapped,
      avatars: a.joined.slice(0, 3).map((j, i) => {
        const f = friendById(j);
        return { color: f ? f.color : '#ccc', ml: i === 0 ? '0' : '-6px' };
      }),
      joinText,
      showBtn: !a.isYours && !full,
      btnLabel: youIn ? 'going ✓' : "i'm in",
      btnBg: youIn ? '#3a2c28' : ACCENT,
      btnColor: youIn ? '#ffe9c2' : '#fff',
      open: () => setState({ detailId: a.id }),
      toggleJoin: (e) => { e.stopPropagation(); toggleJoin(a); },
      showCancel: !!a.isYours,
      cancel: (e) => { e.stopPropagation(); cancelEvent(a); }
    };
  });

  const edges = [[0, 12], [12, 17], [17, 21], [21, 28]];
  // "quiet for now" only makes sense when today's board is empty across the
  // board — if you've got something posted in any other bucket, an empty
  // bucket here is just an empty column, not a prompt to go post something.
  const anyToday = acts.length > 0;
  const buckets = edges.map(([lo, hi]) => {
    const items = acts.filter(a => a.hour >= lo && a.hour < hi).sort((x, y) => x.hour - y.hour);
    return { items, empty: items.length === 0 && !anyToday };
  });

  const tickMarks = [
  [SLIDER_MIN, '8 am'],
  [12, '12 pm'],
  [17, '5 pm'],
  [21, '9 pm'],
  [25, '1 am']
];
  const ticks = tickMarks.map(([h, label], i) => {
    const nextH = tickMarks[i + 1] ? tickMarks[i + 1][0] : SLIDER_MAX;
    const active = previewValue >= h && previewValue < nextH;
    return {
      label: active ? label + ' ●' : label,
      leftPct: ((h - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100,
      align: i === 0 ? 'left' : i === tickMarks.length - 1 ? 'right' : 'center',
      color: active ? '#3a2c28' : 'rgba(58,44,40,.5)'
    };
  });
  const slider = {
    min: SLIDER_MIN, max: SLIDER_MAX, step: 0.5,
    value: previewValue,
    active: previewActive,
    label: fmtTime(previewValue),
    onChange: (e) => setState({ previewHour: parseFloat(e.target.value) }),
    reset: () => setState({ previewHour: null })
  };

  const liveActs = acts.filter(a => !a.wrapped && !a.isYours);
  const subline = liveActs.length
    ? liveActs.length + (liveActs.length === 1 ? ' friend is' : ' friends are') + ' out doing things — tap in whenever'
    : 'nothing on the board yet — start something';

  const weekItems = futureEvents().map(a => {
    const fr = a.isYours ? null : friendById(a.who);
    const youIn = !!a.youIn;
    const count = a.joined.length + (youIn ? 1 : 0);
    return {
      id: a.id,
      title: a.what + ' ' + a.emoji,
      meta: (a.isYours ? 'you' : (fr ? fr.name : a.who)) + ' · ' + a.day + ' ' + fmtTime(a.hour) + ' · 📍 ' + a.place,
      note: a.note,
      color: a.isYours ? '#ffb37e' : (fr ? fr.color : '#ccc'),
      initial: (a.isYours ? name : (fr ? fr.first : a.who))[0].toUpperCase(),
      goingText: a.isYours ? 'yours' : (youIn ? 'going ✓' : (a.spots ? count + '/' + a.spots + ' going' : count + ' going')),
      open: () => setState({ detailId: a.id })
    };
  });

  // Pings are real notification rows from the backend now (posted / joined /
  // asked-to-join / etc.), not client-generated from timing math.
  const unread = S.pingsRaw.filter(p => p.unread).length;
  const tabs = [['today', 'today'], ['friends', 'friends'], ['pings', 'pings'], ['you', 'you']];
  const navTabs = tabs.map(([label, v]) => ({
    key: v,
    label,
    dot: v === 'pings' && unread > 0,
    active: S.view === v,
    go: () => setState({ view: v })
  }));

  const pings = S.pingsRaw.map(p => {
    const f = p.who ? friendById(p.who) : null;
    const isFriendRequest = !!p.requesterId;
    return {
      key: p.id,
      text: p.text, when: p.when,
      initial: f ? f.first[0].toUpperCase() : '🔔',
      color: f ? f.color : 'rgba(58,44,40,.25)',
      bg: p.unread ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.42)',
      unread: !!p.unread,
      isFriendRequest,
      hasAction: !!p.action && !p.going && !isFriendRequest,
      going: !!p.going,
      actionLabel: p.action,
      // ---------- tap the notification itself: jump to the event it's
      // about, without joining it (that's what the cta button is for) ----------
      open: p.actId ? () => {
        setState(prev => ({
          pingsRaw: prev.pingsRaw.map(x => (x.id === p.id ? { ...x, unread: false } : x)),
          detailId: p.actId
        }));
        if (p.unread) api.markPingRead(p.id).catch(() => {});
      } : null,
      act: async () => {
        setState(prev => ({
          pingsRaw: prev.pingsRaw.map(x => (x.id === p.id ? { ...x, unread: false, going: true } : x))
        }));
        if (p.actId) patchEvent(p.actId, { youIn: true });
        toast("going 🎉 it's on your board");
        try { await api.pingAction(p.id); } catch (e) { await loadBoard(); }
      },
      // ---------- friend request: accept / decline ----------
      accept: async () => {
        setState(prev => ({ pingsRaw: prev.pingsRaw.filter(x => x.id !== p.id) }));
        toast("you're friends now 🎉");
        try {
          await api.pingAction(p.id, 'accept');
          await loadBoard(); // pulls the new friend into the friends list right away
        } catch (e) {
          await loadBoard();
          toast("couldn't accept that — try again 🙏");
        }
      },
      decline: async () => {
        setState(prev => ({ pingsRaw: prev.pingsRaw.filter(x => x.id !== p.id) }));
        try {
          await api.pingAction(p.id, 'decline');
        } catch (e) {
          await loadBoard();
          toast("couldn't decline that — try again 🙏");
        }
      },
      // ---------- delete a single notification ----------
      del: async (e) => {
        if (e) e.stopPropagation();
        setState(prev => ({ pingsRaw: prev.pingsRaw.filter(x => x.id !== p.id) }));
        try { await api.deletePing(p.id); } catch (e2) { await loadBoard(); toast("couldn't delete that one 🙏"); }
      }
    };
  });

  // ---------- friend cards, with the circle they're placed in ----------
  const friendCards = friends().map(f => {
    const liveActivity = currentActivityFor(f.id);
    return {
      ...f,
      initial: f.first[0].toUpperCase(),
      circle: f.circle === 'inner' ? 'inner' : 'outer',
      live: !!liveActivity,
      // tapping an orb in the ring opens their status card instead of
      // toggling circle — circle is moved from inside that status card
      showStatus: () => setState({ statusFriendId: f.id }),
      toggleCircle: async () => {
        const next = f.circle === 'inner' ? 'outer' : 'inner';
        setState(prev => ({
          friendsRaw: prev.friendsRaw.map(x => (x.id === f.id ? { ...x, circle: next } : x))
        }));
        toast(next === 'inner' ? f.name + ' moved to your inner circle 💛' : f.name + ' moved to your outer circle');
        try { await api.setFriendCircle(f.id, next); }
        catch (e) {
          setState(prev => ({ friendsRaw: prev.friendsRaw.map(x => (x.id === f.id ? { ...x, circle: f.circle } : x)) }));
          toast("couldn't update that — try again 🙏");
        }
      }
    };
  });

  // ---------- status card shown when you tap a friend's orb in the ring ----------
  // Live = hosting or joined something happening right now, whether or not
  // you were invited or can see it. Offline = not currently doing anything.
  const statusFriendCard = S.statusFriendId ? friendCards.find(f => f.id === S.statusFriendId) : null;
  let friendStatus = null;
  if (statusFriendCard) {
    const act = currentActivityFor(statusFriendCard.id);
    friendStatus = {
      open: true,
      id: statusFriendCard.id,
      name: statusFriendCard.name,
      color: statusFriendCard.color,
      initial: statusFriendCard.initial,
      circle: statusFriendCard.circle,
      live: !!act,
      statusLabel: act ? 'live' : 'offline',
      activityLine: act ? act.what + ' ' + act.emoji : "not up to anything right now",
      placeLine: act ? '📍 ' + act.place : null,
      showOpenActivity: !!act,
      openActivity: act ? () => setState({ statusFriendId: null, detailId: act.id }) : null,
      toggleCircle: statusFriendCard.toggleCircle,
      // Two-tap confirm rather than a native confirm() popup, to match the
      // rest of the app's tone. First tap arms it (button relabels itself
      // as a confirmation); a second tap on the same friend actually
      // removes them. Opening a different friend's card, or closing this
      // one, disarms it again.
      removeArmed: S.confirmRemoveId === statusFriendCard.id,
      removeFriend: () => {
        if (S.confirmRemoveId !== statusFriendCard.id) {
          setState({ confirmRemoveId: statusFriendCard.id });
          return;
        }
        const id = statusFriendCard.id;
        const removedName = statusFriendCard.name;
        setState(prev => ({
          friendsRaw: prev.friendsRaw.filter(x => x.id !== id),
          statusFriendId: null,
          confirmRemoveId: null
        }));
        toast(removedName + ' removed from your friends');
        api.removeFriend(id).catch(async () => {
          toast("couldn't remove that friend — try again 🙏");
          await loadBoard();
        });
      },
      close: () => setState({ statusFriendId: null, confirmRemoveId: null })
    };
  }

  // ---------- onboarding ----------
  const obFriendsList = S.obSuggested.map(f => {
    const added = S.obAdded.includes(f.id);
    return {
      id: f.id, name: fmtName(f.first, f.last), bio: f.bio, color: f.color, initial: f.first[0].toUpperCase(),
      // "requested" not "added" — this sends a friend request now (they
      // have to accept it), it doesn't create the friendship outright.
      btnLabel: added ? 'requested ✓' : '+ add',
      btnBg: added ? '#3a2c28' : 'rgba(58,44,40,.08)',
      btnColor: added ? '#ffe9c2' : '#3a2c28',
      toggle: async () => {
        setState(prev => ({
          obAdded: added ? prev.obAdded.filter(x => x !== f.id) : prev.obAdded.concat(f.id)
        }));
        try { added ? await api.removeFriend(f.id) : await api.addFriend(f.id); }
        catch (e) { setState(prev => ({ obAdded: added ? prev.obAdded.concat(f.id) : prev.obAdded.filter(x => x !== f.id) })); }
      }
    };
  });
  // Dot progress indicator: new-number path is phone->name->verify->friends
  // (4 dots); an existing number skips straight from phone to verify (2
  // dots) since there's no name step or friends step to log back in.
  // obIsNewUser is null while still on the phone screen (not yet known) —
  // default to the longer 4-step path in that case.
  const obScreens = S.obIsNewUser === false ? ['phone', 'verify'] : ['phone', 'name', 'verify', 'friends'];
  const obCurrentIndex = obScreens.indexOf(S.obScreen);
  const obDots = obScreens.map((_, i) => ({ bg: i === obCurrentIndex ? '#3a2c28' : 'rgba(58,44,40,.2)' }));

  // Combines the selected country code with the digits typed in the phone
  // field into a proper E.164 number (e.g. "+1" + "(347) 544-8544" ->
  // "+13475448544"), so the backend/Twilio never has to guess a country.
  function fullPhone() {
    const digits = S.obPhone.replace(/\D/g, '');
    return S.obCountry + digits;
  }

  // Step 1 (phone only) -> looks the number up first. An existing account
  // skips straight to sending the code (no need to ask for a name again —
  // "already on looped? we'll log you right in"); a new number goes to the
  // name screen first, and the code isn't sent until after that.
  async function obNextFn() {
    const digits = S.obPhone.replace(/\D/g, '');
    if (digits.length < 6) { toast('add a valid phone number 📱'); return; }
    setState({ sendingCode: true });
    try {
      const { exists } = await api.checkPhoneExists(fullPhone());
      if (exists) {
        setState({ obIsNewUser: false });
        await api.sendVerificationCode(fullPhone());
        setState({ obScreen: 'verify', sendingCode: false, obCode: '', codeError: '' });
        startResendCooldown();
        toast('welcome back — code sent 📲');
      } else {
        setState({ obIsNewUser: true, sendingCode: false, obScreen: 'name' });
      }
    } catch (e) {
      setState({ sendingCode: false });
      toast(e.message || "couldn't check that number — try again 🙏");
    }
  }

  // Name screen (new numbers only) -> now that we have a name, send the
  // verification code and move to the verify screen.
  async function nameNextFn() {
    if (!S.obFirst.trim()) { toast('tell us your first name 🙂'); return; }
    setState({ sendingCode: true });
    try {
      await api.sendVerificationCode(fullPhone());
      setState({ obScreen: 'verify', sendingCode: false, obCode: '', codeError: '' });
      startResendCooldown();
      toast('code sent 📲');
    } catch (e) {
      setState({ sendingCode: false });
      toast(e.message || "couldn't send that code — check the number 🙏");
    }
  }

  // Verify screen -> checks the code, then either:
  //   new number:      creates the account with the name from step 2,
  //                     loads suggested friends, moves to the friends screen
  //   existing number:  logs straight in (no name was collected this time —
  //                     the backend ignores firstName/lastName for an
  //                     existing account) and skips onboarding entirely
  async function verifyCodeFn() {
    const code = S.obCode.trim();
    if (code.length !== 6) { setState({ codeError: 'enter the 6-digit code' }); return; }
    setState({ verifying: true, codeError: '' });
    try {
      const { approved } = await api.checkVerificationCode(fullPhone(), code);
      if (!approved) {
        setState({ verifying: false, codeError: "that code didn't match — try again" });
        return;
      }

      if (S.obIsNewUser) {
        await api.signup(S.obFirst.trim(), S.obLast.trim(), fullPhone());
        const obSuggested = await api.discoverUsers();
        setState({ obSuggested, obScreen: 'friends', verifying: false });
      } else {
        // Returning user — /api/signup doubles as login for a known phone
        // number (no firstName required for that branch server-side).
        await api.signup('', '', fullPhone());
        const me = await api.me();
        setState({
          name: me.firstName, last: me.lastName || '', phone: me.phone || '', bio: me.bio || '',
          onboarded: true, view: 'today', verifying: false
        });
        toast('welcome back 💛');
        await loadBoard();
      }
    } catch (e) {
      setState({ verifying: false, codeError: e.message || 'something went wrong — try again' });
    }
  }

  async function resendCodeFn() {
    if (S.resendCooldown > 0 || S.resending) return;
    setState({ resending: true });
    try {
      await api.sendVerificationCode(fullPhone());
      startResendCooldown();
      toast('sent another code 📲');
    } catch (e) {
      toast(e.message || "couldn't resend that code 🙏");
    } finally {
      setState({ resending: false });
    }
  }

  // composer options
  const emojis = ['☕', '🏋️', '🎬', '🍜', '📚', '🚶', '🎮', '🧺', '🍦'];
  const spotsOptions = [{ value: '0', label: 'open to everyone' }].concat(
    Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: (i + 1) + (i === 0 ? ' spot' : ' spots') }))
  );
  const emojiChips = emojis.map(e => ({
    char: e,
    bg: S.cEmoji === e ? 'rgba(255,138,92,.2)' : 'rgba(255,255,255,.7)',
    border: S.cEmoji === e ? ACCENT : 'rgba(58,44,40,.15)',
    pick: () => setState({ cEmoji: S.cEmoji === e ? '' : e })
  }));
  const visibilityOptions = [
    { value: 'outer', label: 'my friends (outer + inner circle)' },
    { value: 'inner', label: 'inner circle only 💛' }
  ];
  const dateOptions = [0, 1, 2, 3, 4, 5].map(off => {
    const dd = new Date(); dd.setDate(dd.getDate() + off);
    const wd = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dd.getDay()];
    const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][dd.getMonth()];
    const label = off === 0 ? 'today' : off === 1 ? 'tomorrow' : wd + ' ' + mo + ' ' + dd.getDate();
    return { value: String(off), label };
  });
  const cDateOff = parseInt(S.cDate, 10) || 0;
  // Editing an existing "today" post can have a start time earlier than
  // right now — don't clip the picker to future-only in that case, or
  // saving an edit would silently bump the time forward.
  const editingToday = !!S.editingId && cDateOff === 0;
  // Suggested default start time when the composer opens fresh: the next
  // quarter-hour, with a little buffer so it isn't immediately "now".
  const suggestedStart = Math.min(23.75, Math.ceil(now * 4) / 4 + 0.25);
  const cTime = S.cTime || hourToClockValue(cDateOff === 0 && !editingToday ? suggestedStart : 8);
  // Earliest selectable clock time — only constrains "today", and only
  // when not editing an existing today post (see above).
  const cTimeMin = (cDateOff === 0 && !editingToday) ? hourToClockValue(now) : undefined;
  // End time defaults to 1.5 hours after start, staying in sync with the
  // start time until the person edits it directly (cEndTimeTouched) or
  // marks the event as having no end time.
  const startHourForDefaults = clockValueToHour(cTime);
  const cEndTime = S.cNoEndTime
    ? ''
    : (S.cEndTime || (startHourForDefaults != null ? hourToClockValue(Math.min(24, startHourForDefaults + 1.5)) : ''));

  async function postActivity() {
    const what = S.cTitle.trim();
    if (!what) { toast("say what you're up to first 🙂"); return; }
    const dayOffset = Math.min(5, Math.max(0, parseInt(S.cDate, 10) || 0));
    const startHour = clockValueToHour(cTime);
    if (startHour == null) { toast('pick a start time 🕐'); return; }
    if (dayOffset === 0 && !editingToday && startHour < now) {
      toast("pick a time that hasn't passed yet 🕐");
      return;
    }
    let endHour = null;
    if (!S.cNoEndTime) {
      endHour = clockValueToHour(cEndTime);
      if (endHour == null) endHour = Math.min(24, startHour + 1.5);
      if (endHour <= startHour) {
        toast('end time should be after the start time 🕐');
        return;
      }
    }
    const payload = {
      emoji: S.cEmoji || '✨',
      what,
      place: S.cPlace.trim() || 'somewhere good',
      note: S.cNote.trim(),
      dayOffset,
      hour: startHour,
      endHour,
      spots: parseInt(S.cSpots, 10) || 0,
      visibility: S.cVisibility || 'outer'
    };
    const editingId = S.editingId;
    setState({ composerOpen: false, ...emptyComposerFields(), view: 'today' });
    try {
      if (editingId) {
        const updated = await api.updateEvent(editingId, payload);
        patchEvent(editingId, updated);
        toast('updated — the new details are live ✏️');
      } else {
        const created = await api.createEvent(payload);
        setState(prev => ({ events: prev.events.concat(created) }));
        toast(dayOffset === 0 ? "it's on the board — friends can tap in 🎉" : 'posted for ' + dayLabel(dayOffset) + ' — it\'s in "later this week" 🎉');
      }
    } catch (e) {
      toast(editingId ? "couldn't save those changes — try again 🙏" : "couldn't post that — try again 🙏");
    }
  }

  const yourPosts = state.events.filter(a => a.isYours).map(a => ({
    id: a.id,
    title: a.what + ' ' + a.emoji,
    meta: (a.day ? a.day + ' ' : '') + fmtTime(a.hour) + ' · ' + a.place,
    open: () => setState({ detailId: a.id }),
    cancel: () => cancelEvent(a)
  }));

  const goingEvents = state.events
    .filter(a => !a.isYours && a.youIn)
    .map(a => {
      const fr = friendById(a.who);
      return {
        id: a.id,
        title: a.what + ' ' + a.emoji,
        meta: (fr ? fr.name : a.who) + ' · ' + (a.day ? a.day + ' ' : '') + fmtTime(a.hour) + ' · 📍 ' + a.place,
        color: fr ? fr.color : 'rgba(58,44,40,.25)',
        initial: (fr ? fr.first : a.who)[0].toUpperCase(),
        open: () => setState({ detailId: a.id })
      };
    });

  const skies = [['auto', 'auto ✨'], ['morning', 'morning ☀️'], ['sunset', 'sunset 🌅'], ['night', 'night 🌙']];
  const skyChips = skies.map(([v, label]) => {
    const on = S.skyOverride === v;
    return {
      key: v, label,
      bg: on ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.4)',
      border: on ? '#3a2c28' : 'rgba(58,44,40,.18)',
      pick: () => setState({ skyOverride: v })
    };
  });

  // ---------- event detail popup ----------
  const detailActivity = S.detailId ? findActivity(S.detailId) : null;
  let detail = null;
  if (detailActivity) {
    const a = detailActivity;
    const fr = friendById(a.who);
    const whoName = a.isYours ? 'you' : (fr ? fr.name : a.who);
    const youIn = !!a.youIn;
    const joinedIds = a.joined || [];
    const joinedCount = joinedIds.length + (youIn ? 1 : 0);
    const spotsLeft = a.spots ? a.spots - joinedCount : 0;
    const goingNames = joinedIds.map(j => { const f = friendById(j); return f ? f.name : j; });
    if (youIn) goingNames.push('you');
    const timeRange = (a.day ? a.day + ' · ' : 'today, ') + fmtTime(a.hour) + (a.dur != null ? ' – ' + fmtTime(a.hour + a.dur) : ' – no end time set');
    const full = a.spots && spotsLeft <= 0 && !youIn;

    // ---------- google maps embed for "getting there" ----------
    // Uses the Maps Embed API (just an iframe, no JS SDK/billing surprises
    // beyond the free embed tier). Set VITE_GOOGLE_MAPS_API_KEY in
    // app/.env(.local) to turn this on; falls back to the old placeholder
    // if it's not configured.
    const mapEmbedUrl = GOOGLE_MAPS_KEY && a.place
      ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${encodeURIComponent(a.place)}`
      : null;

    detail = {
      color: a.isYours ? '#ffb37e' : (fr ? fr.color : '#ccc'),
      initial: (whoName === 'you' ? name : whoName)[0].toUpperCase(),
      who: whoName,
      whoUpper: whoName.toUpperCase(),
      postedAgo: a.postedAgo || 'posted just now',
      title: a.what + ' ' + a.emoji,
      hasNote: !!a.note,
      note: a.note || '',
      place: a.place,
      timeRange,
      mapEmbedUrl,
      avatars: (goingNames.length ? goingNames : ['?']).slice(0, 4).map((n, i) => {
        const f = friends().find(x => x.name === n);
        return {
          color: n === 'you' ? '#ffb37e' : (f ? f.color : 'rgba(58,44,40,.2)'),
          initial: n === '?' ? '·' : n[0].toUpperCase(),
          ml: i === 0 ? '0' : '-8px'
        };
      }),
      goingNames: goingNames.length ? goingNames.join(', ') : 'no one yet — be the first 👀',
      spotsLine: a.spots ? (spotsLeft > 0 ? spotsLeft + (spotsLeft === 1 ? ' spot open' : ' spots open') : 'full house') : 'open to everyone',
      distance: (S.myCoords && a.lat != null && a.lng != null)
        ? formatDistance(milesBetween(S.myCoords.lat, S.myCoords.lng, a.lat, a.lng))
        : (a.dist || 'distance unknown'),
      showJoin: !a.isYours,
      isYours: !!a.isYours,
      btnLabel: youIn ? 'going ✓' : (full ? 'ask to join' : "i'll be there!"),
      btnBg: youIn ? '#3a2c28' : (full ? 'rgba(58,44,40,.1)' : ACCENT),
      btnColor: youIn ? '#ffe9c2' : (full ? '#3a2c28' : '#fff'),
      toggleJoin: () => { setState({ detailId: null }); toggleJoin(a); },
      cantMake: () => {
        setState({ detailId: null });
        if (youIn) toggleJoin(a);
        toast("let " + whoName + " know you can't make it 💛");
      },
      cancel: () => { setState({ detailId: null }); cancelEvent(a); },
      // ---------- edit button ----------
      edit: () => {
        setState({
          detailId: null,
          composerOpen: true,
          editingId: a.id,
          cTitle: a.what,
          cPlace: a.place,
          cNote: a.note || '',
          cDate: String(a.dayOffset || 0),
          cTime: hourToClockValue(a.hour),
          cEndTime: a.dur != null ? hourToClockValue(a.hour + a.dur) : '',
          cNoEndTime: a.dur == null,
          cSpots: String(a.spots || 0),
          cEmoji: a.emoji,
          cVisibility: a.visibility === 'inner' ? 'inner' : 'outer'
        });
      }
    };
  }

  return {
    accent: ACCENT,
    bgGradient,
    isOnboarding,
    isLoading,

    onboarding: {
      step1: S.obScreen === 'phone',
      stepVerify: S.obScreen === 'verify',
      step3: S.obScreen === 'name',
      step4: S.obScreen === 'friends',
      obFirst: S.obFirst, obLast: S.obLast, obPhone: S.obPhone,
      obCountry: S.obCountry,
      setObCountry: (e) => setState({ obCountry: e.target.value }),
      countryOptions: COUNTRY_CODES,
      fullPhone: fullPhone(),
      hasName: !!S.obFirst.trim(),
      previewName: fmtName(S.obFirst.trim(), S.obLast.trim()),
      setObFirst: (e) => setState({ obFirst: e.target.value }),
      setObLast: (e) => setState({ obLast: e.target.value }),
      setObPhone: (e) => setState({ obPhone: e.target.value }),
      phoneKeyDown: (e) => { if (e.key === 'Enter') obNextFn(); },
      nameKeyDown: (e) => { if (e.key === 'Enter') nameNextFn(); },
      next: obNextFn,
      sendingCode: S.sendingCode,

      obCode: S.obCode,
      setObCode: (e) => setState({ obCode: e.target.value.replace(/\D/g, '').slice(0, 6), codeError: '' }),
      codeKeyDown: (e) => { if (e.key === 'Enter') verifyCodeFn(); },
      codeError: S.codeError,
      verifying: S.verifying,
      verify: verifyCodeFn,
      resend: resendCodeFn,
      resendCooldown: S.resendCooldown,
      resending: S.resending,

      // The name screen's button ("continue") sends the verification code
      // once a name is entered — reuses sendingCode for its loading state,
      // same as step 1's button.
      createAccount: nameNextFn,
      creatingAccount: S.sendingCode,

      friendsList: obFriendsList,
      dots: obDots,
      finish: async () => {
        setState({ onboarded: true, view: 'today' });
        toast('welcome to looped 💛 here\'s today');
        await loadBoard();
      }
    },

    view: S.view,
    nav: {
      tabs: navTabs,
      clockLine: clockLineFor(now),
      yourInitial: (name[0] || 'y').toUpperCase(),
      goToday: () => setState({ view: 'today' }),
      goYou: () => setState({ view: 'you' })
    },

    today: {
      greeting, subline, ticks, slider, buckets, weekItems,
      openComposer: () => setState({ composerOpen: true, ...emptyComposerFields() })
    },

    pings: {
      list: pings,
      markAllRead: async () => {
        setState(prev => ({ pingsRaw: prev.pingsRaw.map(p => ({ ...p, unread: false })) }));
        try { await api.markPingsRead(); } catch (e) { /* best-effort */ }
      }
    },

    friends: {
      countLine: friends().length + ' friends on looped · ' + liveActs.length + ' out right now',
      query: S.friendQuery,
      setQuery: (e) => setState({ friendQuery: e.target.value }),
      inviteKeyDown: (e) => { if (e.key === 'Enter') doInvite(); },
      sendInvite: () => doInvite(),
      countryOptions: COUNTRY_CODES,
      copyInviteLink: async () => {
        const link = window.location.origin;
        try {
          await navigator.clipboard.writeText(link);
          toast('invite link copied 🔗');
        } catch (e) {
          toast("couldn't copy that — try again 🙏");
        }
      },
      contactsLinked: S.contactsLinked,
      linkContacts: () => { setState({ contactsLinked: true }); toast('contacts linked 📇 search friends by name'); },
      contactQuery: S.contactQuery,
      setContactQuery: (e) => setState({ contactQuery: e.target.value }),
      searchContacts: () => doSearch(),
      searchKeyDown: (e) => { if (e.key === 'Enter') doSearch(); },
      cards: friendCards,
      you: { initial: (name[0] || 'y').toUpperCase(), color: '#ffb37e', avatarUrl: null },
      status: friendStatus || { open: false }
    },

    profile: {
      name: fmtName(name, S.last),
      phone: S.phone || 'add your number in settings',
      bio: S.bio,
      setBio: (e) => {
        const bio = e.target.value;
        setState({ bio });
        api.updateBio(bio).catch(() => { /* best-effort; retried on next edit */ });
      },
      statPosted: yourPosts.length,
      statJoined: goingEvents.length,
      statFriends: friends().length,
      yourPosts,
      noPosts: yourPosts.length === 0,
      goingEvents,
      noGoing: goingEvents.length === 0,
      openComposerFromYou: () => setState({ composerOpen: true, view: 'today' }),
      skyChips,
      yourInitial: (name[0] || 'y').toUpperCase(),
      resetApp: async () => {
        try { await api.logout(); } catch (e) { /* ignore */ }
        setStateRaw(initialState());
        setState({ view: 'onboarding' });
      },
      // Two-tap confirm, same pattern as removing a friend — first tap
      // arms it (button relabels to a confirmation), second tap actually
      // deletes. This is NOT reversible: it wipes the account and
      // everything tied to it (posts, joins, friendships, pings) on the
      // backend, not just a local logout.
      deleteAccountArmed: S.confirmDeleteAccount,
      armDeleteAccount: () => setState({ confirmDeleteAccount: true }),
      cancelDeleteAccount: () => setState({ confirmDeleteAccount: false }),
      deleteAccount: async () => {
        if (!S.confirmDeleteAccount) { setState({ confirmDeleteAccount: true }); return; }
        try {
          await api.deleteAccount();
        } catch (e) {
          toast("couldn't delete your account — try again 🙏");
          setState({ confirmDeleteAccount: false });
          return;
        }
        setStateRaw(initialState());
        setState({ view: 'onboarding' });
      }
    },

    detail: {
      open: !!detail,
      ...detail,
      close: () => setState({ detailId: null })
    },

    composer: {
      open: S.composerOpen,
      editing: !!S.editingId,
      close: () => setState({ composerOpen: false, ...emptyComposerFields() }),
      cTitle: S.cTitle, setCTitle: (e) => setState({ cTitle: e.target.value }),
      cPlace: S.cPlace, setCPlace: (e) => setState({ cPlace: e.target.value }),
      cNote: S.cNote, setCNote: (e) => setState({ cNote: e.target.value }),
      cDate: S.cDate, setCDate: (e) => setState({ cDate: e.target.value }),
      cTime, setCTime: (e) => setState({ cTime: e.target.value }),
      cTimeMin,
      cEndTime, setCEndTime: (e) => setState({ cEndTime: e.target.value }),
      cNoEndTime: S.cNoEndTime,
      toggleNoEndTime: (e) => setState({ cNoEndTime: e.target.checked }),
      cSpots: S.cSpots, setCSpots: (e) => setState({ cSpots: e.target.value }),
      cVisibility: S.cVisibility, setCVisibility: (e) => setState({ cVisibility: e.target.value }),
      dateOptions, emojiChips, spotsOptions, visibilityOptions,
      postActivity
    },

    toast: { shown: !!S.toast, text: S.toast }
  };

  function normalizeInvitePhone(raw) {
    const trimmed = raw.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('+')) return '+' + digits;
    if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
    return '+1' + digits; // assume US/Canada if no country code was given
  }

  function doInvite() {
    const q = S.friendQuery.trim();
    const digits = q.replace(/\D/g, '');
    if (digits.length < 7) { toast('enter a phone number to invite 📱'); return; }
    const phone = normalizeInvitePhone(q);
    setState({ friendQuery: '' });
    api.inviteFriend(phone)
      .then(res => toast(res.invited ? 'invite texted to ' + q + ' ✉️' : (res.message || 'invite sent')))
      .catch(() => toast("couldn't send that invite 🙏"));
  }
  function doSearch() {
    const q = S.contactQuery.trim();
    if (!q) { toast('type a name to search 🙂'); return; }
    toast('searching contacts for "' + q + '"…');
    setState({ contactQuery: '' });
  }
}