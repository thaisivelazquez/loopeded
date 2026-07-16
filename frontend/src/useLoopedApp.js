import { useEffect, useRef, useState } from 'react';
import { fmtName } from './lib/data.js';
import { nowHour, modeForHour, gradientForMode, fmtTime, dayLabel, clockLine as clockLineFor } from './lib/time.js';
import { api } from './lib/api.js';
import { COUNTRY_CODES } from './lib/countryCodes.js';

const ACCENT = '#ff8a5c';
const RESEND_COOLDOWN_SECONDS = 60;

function initialState() {
  return {
    view: 'loading', // 'loading' | 'onboarding' | 'today' | 'friends' | 'pings' | 'you'
    name: '', last: '', phone: '', bio: '',
    onboarded: false,
    obStep: 1, // 1 = name+phone, 2 = verify code, 3 = suggested friends
    obFirst: '', obLast: '', obPhone: '', obCountry: '+1',
    obCode: '', codeError: '', sendingCode: false, verifying: false, resendCooldown: 0,
    obSuggested: [], obAdded: [],
    friendsRaw: [],
    events: [],
    pingsRaw: [],
    composerOpen: false,
    cTitle: '', cPlace: '', cNote: '', cDate: '0', cTime: '', cSpots: '0', cEmoji: '',
    toast: '',
    friendQuery: '', contactQuery: '', contactsLinked: false,
    skyOverride: 'auto',
    previewHour: null,
    detailId: null,
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
      setState({ friendsRaw, events, pingsRaw });
    } catch (e) {
      toast("couldn't load your board — check your connection 📡");
    }
  }

  // ---------- time & sky ----------
  const now = nowHour(new Date(state.nowTick));
  const mode = state.skyOverride !== 'auto' ? state.skyOverride : modeForHour(now);
  const bgGradient = gradientForMode(mode);

  // ---------- friends (from the API instead of hardcoded mock data) ----------
  function friends() {
    return state.friendsRaw.map(f => ({ ...f, name: fmtName(f.first, f.last) }));
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
    if (now > a.hour + (a.dur || 1.25)) return 'wrapped';
    if (now >= a.hour - 0.25) return 'now';
    return 'open';
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
  const SLIDER_MIN = 8, SLIDER_MAX = 25;
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

  const edges = [[0, 12], [12, 17], [17, 21], [21, 25]];
  const buckets = edges.map(([lo, hi]) => {
    const items = acts.filter(a => a.hour >= lo && a.hour < hi).sort((x, y) => x.hour - y.hour);
    return { items, empty: items.length === 0 };
  });

  const tickMarks = [[SLIDER_MIN, '8 am'], [12, 'noon'], [17, '5 pm'], [21, '9 pm']];
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
    return {
      key: p.id,
      text: p.text, when: p.when,
      initial: f ? f.first[0].toUpperCase() : '🔔',
      color: f ? f.color : 'rgba(58,44,40,.25)',
      bg: p.unread ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.42)',
      unread: !!p.unread,
      hasAction: !!p.action && !p.going,
      going: !!p.going,
      actionLabel: p.action,
      act: async () => {
        setState(prev => ({
          pingsRaw: prev.pingsRaw.map(x => (x.id === p.id ? { ...x, unread: false, going: true } : x))
        }));
        if (p.actId) patchEvent(p.actId, { youIn: true });
        toast("going 🎉 it's on your board");
        try { await api.pingAction(p.id); } catch (e) { await loadBoard(); }
      }
    };
  });

  const friendCards = friends().map(f => ({ ...f, initial: f.first[0].toUpperCase() }));

  // ---------- onboarding ----------
  const obFriendsList = S.obSuggested.map(f => {
    const added = S.obAdded.includes(f.id);
    return {
      id: f.id, name: fmtName(f.first, f.last), bio: f.bio, color: f.color, initial: f.first[0].toUpperCase(),
      btnLabel: added ? 'added ✓' : '+ add',
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
  const obDots = [1, 2, 3].map(n => ({ bg: n === S.obStep ? '#3a2c28' : 'rgba(58,44,40,.2)' }));

  // Combines the selected country code with the digits typed in the phone
  // field into a proper E.164 number (e.g. "+1" + "(347) 544-8544" ->
  // "+13475448544"), so the backend/Twilio never has to guess a country.
  function fullPhone() {
    const digits = S.obPhone.replace(/\D/g, '');
    return S.obCountry + digits;
  }

  // Step 1 -> sends the SMS code via Twilio Verify, then moves to step 2.
  async function obNextFn() {
    if (!S.obFirst.trim()) { toast('tell us your first name 🙂'); return; }
    const digits = S.obPhone.replace(/\D/g, '');
    if (digits.length < 6) { toast('add a valid phone number 📱'); return; }
    setState({ sendingCode: true });
    try {
      await api.sendVerificationCode(fullPhone());
      setState({ obStep: 2, sendingCode: false, obCode: '', codeError: '' });
      startResendCooldown();
      toast('code sent 📲');
    } catch (e) {
      setState({ sendingCode: false });
      toast(e.message || "couldn't send that code — check the number 🙏");
    }
  }

  // Step 2 -> checks the code with Twilio, and only THEN creates the
  // account (POST /api/signup, which is now gated behind verification).
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
      await api.signup(S.obFirst.trim(), S.obLast.trim(), fullPhone());
      const obSuggested = await api.discoverUsers();
      setState({ obSuggested, obStep: 3, verifying: false });
    } catch (e) {
      setState({ verifying: false, codeError: e.message || 'something went wrong — try again' });
    }
  }

  async function resendCodeFn() {
    if (S.resendCooldown > 0) return;
    try {
      await api.sendVerificationCode(fullPhone());
      startResendCooldown();
      toast('sent another code 📲');
    } catch (e) {
      toast(e.message || "couldn't resend that code 🙏");
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
  const dateOptions = [0, 1, 2, 3, 4, 5].map(off => {
    const dd = new Date(); dd.setDate(dd.getDate() + off);
    const wd = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dd.getDay()];
    const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][dd.getMonth()];
    const label = off === 0 ? 'today' : off === 1 ? 'tomorrow' : wd + ' ' + mo + ' ' + dd.getDate();
    return { value: String(off), label };
  });
  const cDateOff = parseInt(S.cDate, 10) || 0;
  const timeOptions = [];
  {
    let t = cDateOff === 0 ? Math.ceil(now * 2) / 2 + 0.5 : 8;
    const tEnd = cDateOff === 0 ? 24 : 23.5;
    for (let i = 0; i < 40 && t <= tEnd; i++, t += 0.5) {
      timeOptions.push({ value: String(t), label: fmtTime(t) });
    }
    if (!timeOptions.length) timeOptions.push({ value: '20', label: fmtTime(20) });
  }
  const cTime = timeOptions.some(o => o.value === S.cTime) ? S.cTime : (timeOptions[0] && timeOptions[0].value);

  async function postActivity() {
    const what = S.cTitle.trim();
    if (!what) { toast("say what you're up to first 🙂"); return; }
    const dayOffset = Math.min(5, Math.max(0, parseInt(S.cDate, 10) || 0));
    const validTime = timeOptions.some(o => o.value === S.cTime) ? S.cTime : (timeOptions[0] && timeOptions[0].value);
    const payload = {
      emoji: S.cEmoji || '✨',
      what,
      place: S.cPlace.trim() || 'somewhere good',
      note: S.cNote.trim(),
      dayOffset,
      hour: parseFloat(validTime || '20'),
      spots: parseInt(S.cSpots, 10) || 0
    };
    setState({
      composerOpen: false, cTitle: '', cPlace: '', cNote: '', cDate: '0', cTime: '', cEmoji: '', cSpots: '0', view: 'today'
    });
    try {
      const created = await api.createEvent(payload);
      setState(prev => ({ events: prev.events.concat(created) }));
      toast(dayOffset === 0 ? "it's on the board — friends can tap in 🎉" : 'posted for ' + dayLabel(dayOffset) + ' — it\'s in "later this week" 🎉');
    } catch (e) {
      toast("couldn't post that — try again 🙏");
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
    const timeRange = (a.day ? a.day + ' · ' : 'today, ') + fmtTime(a.hour) + ' – ' + fmtTime(a.hour + (a.dur || 1.5));
    const full = a.spots && spotsLeft <= 0 && !youIn;
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
      distance: a.dist || 'distance unknown',
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
      cancel: () => { setState({ detailId: null }); cancelEvent(a); }
    };
  }

  return {
    accent: ACCENT,
    bgGradient,
    isOnboarding,
    isLoading,

    onboarding: {
      step1: S.obStep === 1,
      stepVerify: S.obStep === 2,
      step3: S.obStep === 3,
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
      nameKeyDown: (e) => { if (e.key === 'Enter') obNextFn(); },
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
      openComposer: () => setState({ composerOpen: true })
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
      contactsLinked: S.contactsLinked,
      linkContacts: () => { setState({ contactsLinked: true }); toast('contacts linked 📇 search friends by name'); },
      contactQuery: S.contactQuery,
      setContactQuery: (e) => setState({ contactQuery: e.target.value }),
      searchContacts: () => doSearch(),
      searchKeyDown: (e) => { if (e.key === 'Enter') doSearch(); },
      cards: friendCards,
      you: { initial: (name[0] || 'y').toUpperCase(), color: '#ffb37e', avatarUrl: null }
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
      }
    },

    detail: {
      open: !!detail,
      ...detail,
      close: () => setState({ detailId: null })
    },

    composer: {
      open: S.composerOpen,
      close: () => setState({ composerOpen: false }),
      cTitle: S.cTitle, setCTitle: (e) => setState({ cTitle: e.target.value }),
      cPlace: S.cPlace, setCPlace: (e) => setState({ cPlace: e.target.value }),
      cNote: S.cNote, setCNote: (e) => setState({ cNote: e.target.value }),
      cDate: S.cDate, setCDate: (e) => setState({ cDate: e.target.value, cTime: '' }),
      cTime, setCTime: (e) => setState({ cTime: e.target.value }),
      cSpots: S.cSpots, setCSpots: (e) => setState({ cSpots: e.target.value }),
      dateOptions, emojiChips, timeOptions, spotsOptions,
      postActivity
    },

    toast: { shown: !!S.toast, text: S.toast }
  };

  function doInvite() {
    const q = S.friendQuery.trim();
    const digits = q.replace(/\D/g, '');
    if (digits.length < 7) { toast('enter a phone number to invite 📱'); return; }
    setState({ friendQuery: '' });
    api.inviteFriend(q)
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