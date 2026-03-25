'use strict';

// Twin Cities, MN coordinates
const LAT = 44.9778;
const LON = -93.2650;
const TIMEZONE = 'America/Chicago';

const API_URL = [
  'https://api.open-meteo.com/v1/forecast',
  `?latitude=${LAT}&longitude=${LON}`,
  '&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m',
  '&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max',
  '&current_weather=true',
  '&temperature_unit=fahrenheit',
  '&windspeed_unit=mph',
  '&precipitation_unit=inch',
  `&timezone=${TIMEZONE}`,
  '&forecast_days=7'
].join('');

// WMO weather code descriptions and emoji
const WMO = {
  0:  { label: 'Clear sky',          icon: '☀️' },
  1:  { label: 'Mainly clear',       icon: '🌤️' },
  2:  { label: 'Partly cloudy',      icon: '⛅' },
  3:  { label: 'Overcast',           icon: '☁️' },
  45: { label: 'Foggy',              icon: '🌫️' },
  48: { label: 'Icy fog',            icon: '🌫️' },
  51: { label: 'Light drizzle',      icon: '🌦️' },
  53: { label: 'Drizzle',            icon: '🌦️' },
  55: { label: 'Heavy drizzle',      icon: '🌦️' },
  61: { label: 'Light rain',         icon: '🌧️' },
  63: { label: 'Rain',               icon: '🌧️' },
  65: { label: 'Heavy rain',         icon: '🌧️' },
  71: { label: 'Light snow',         icon: '🌨️' },
  73: { label: 'Snow',               icon: '❄️' },
  75: { label: 'Heavy snow',         icon: '❄️' },
  77: { label: 'Snow grains',        icon: '🌨️' },
  80: { label: 'Light showers',      icon: '🌦️' },
  81: { label: 'Showers',            icon: '🌧️' },
  82: { label: 'Heavy showers',      icon: '⛈️' },
  85: { label: 'Snow showers',       icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm',       icon: '⛈️' },
  96: { label: 'Thunderstorm / hail',icon: '⛈️' },
  99: { label: 'Thunderstorm / hail',icon: '⛈️' },
};

function wmo(code) {
  return WMO[code] || { label: 'Unknown', icon: '🌡️' };
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseLocalDate(dateStr) {
  // dateStr is 'YYYY-MM-DD' — parse as local, not UTC
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDay(dateStr, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const d = parseLocalDate(dateStr);
  return DAYS[d.getDay()];
}

function formatHour(isoStr) {
  // isoStr: 'YYYY-MM-DDTHH:00'
  const [, timePart] = isoStr.split('T');
  const hour = parseInt(timePart.split(':')[0], 10);
  if (hour === 0)  return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function formatDate(dateStr) {
  const d = parseLocalDate(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function round(n) {
  return Math.round(n);
}

// ── DOM refs ──────────────────────────────────────────────
const $loading      = document.getElementById('loading');
const $errorMsg     = document.getElementById('error-msg');
const $retryBtn     = document.getElementById('retry-btn');
const $dailyList    = document.getElementById('daily-list');
const $currentTemp  = document.getElementById('current-temp');
const $currentCond  = document.getElementById('current-condition');
const $currentFeels = document.getElementById('current-feels');
const $lastUpdated  = document.getElementById('last-updated');

// ── Tab switching ─────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ── Fetch & render ────────────────────────────────────────
async function fetchWeather() {
  $loading.classList.remove('hidden');
  $errorMsg.classList.add('hidden');
  $dailyList.innerHTML = '';

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    $loading.classList.add('hidden');
    renderCurrent(data);
    renderDaily(data);
    $lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } catch (err) {
    $loading.classList.add('hidden');
    $errorMsg.classList.remove('hidden');
    console.error('Weather fetch failed:', err);
  }
}

function renderCurrent(data) {
  const cw = data.current_weather;
  const info = wmo(cw.weathercode);
  $currentTemp.textContent = round(cw.temperature);
  $currentCond.textContent = `${info.icon}  ${info.label}`;

  // Use the first hourly apparent_temperature near current hour for "feels like"
  const now = new Date();
  const currentHourStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
  const idx = data.hourly.time.findIndex(t => t === currentHourStr);
  if (idx !== -1) {
    const feels = round(data.hourly.apparent_temperature[idx]);
    $currentFeels.textContent = `Feels like ${feels}°F`;
  }
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function renderDaily(data) {
  const { daily, hourly } = data;
  const now = new Date();
  const fragment = document.createDocumentFragment();

  daily.time.forEach((dateStr, i) => {
    const info      = wmo(daily.weathercode[i]);
    const high      = round(daily.temperature_2m_max[i]);
    const low       = round(daily.temperature_2m_min[i]);
    const precip    = daily.precipitation_sum[i];
    const precipPct = daily.precipitation_probability_max[i];
    const wind      = round(daily.windspeed_10m_max[i]);

    let precipStr = '';
    if (precipPct > 0) {
      precipStr = `💧 ${precipPct}%`;
      if (precip > 0) precipStr += ` · ${precip.toFixed(2)}"`;
    }

    const card = document.createElement('div');
    card.className = 'daily-card' + (i === 0 ? ' today expanded' : '');

    card.innerHTML = `
      <div class="daily-summary">
        <div>
          <div class="daily-day">${formatDay(dateStr, i)}</div>
          <div class="daily-date">${formatDate(dateStr)}</div>
        </div>
        <div class="daily-icon">${info.icon}</div>
        <div class="daily-temps">
          <div class="daily-high">${high}°</div>
          <div class="daily-low">${low}°</div>
        </div>
        <div class="daily-detail">
          <div class="daily-condition">${info.label}</div>
          ${precipStr ? `<div class="daily-precip">${precipStr}</div>` : ''}
          <div class="daily-wind">💨 ${wind} mph</div>
        </div>
        <div class="daily-chevron">›</div>
      </div>
      <div class="hourly-subpanel">${buildHourlySubpanel(dateStr, i, hourly, now)}</div>
    `;
    fragment.appendChild(card);
  });

  $dailyList.appendChild(fragment);
}

function buildHourlySubpanel(dateStr, dayIndex, hourly, now) {
  const cutoff = now.getTime() - 30 * 60 * 1000;
  let firstIdx = -1;
  const rows = [];

  for (let i = 0; i < hourly.time.length; i++) {
    const timeStr = hourly.time[i];
    if (!timeStr.startsWith(dateStr)) continue;
    // For today, skip hours more than 30 min in the past
    if (dayIndex === 0 && new Date(timeStr).getTime() < cutoff) continue;
    if (firstIdx === -1) firstIdx = i;

    const info   = wmo(hourly.weathercode[i]);
    const temp   = round(hourly.temperature_2m[i]);
    const precip = hourly.precipitation_probability[i];
    const wind   = round(hourly.windspeed_10m[i]);
    const isNow  = (i === firstIdx && dayIndex === 0);

    rows.push(`
      <div class="hourly-row${isNow ? ' current-hour' : ''}">
        <div class="hourly-time">${isNow ? 'Now' : formatHour(timeStr)}</div>
        <div class="hourly-icon">${info.icon}</div>
        <div class="hourly-temp">${temp}°</div>
        <div class="hourly-precip">${precip > 0 ? `💧 ${precip}%` : ''}</div>
        <div class="hourly-wind">${wind} mph</div>
      </div>`);
  }

  return rows.join('');
}

$dailyList.addEventListener('click', e => {
  const card = e.target.closest('.daily-card');
  if (!card) return;
  const isExpanded = card.classList.contains('expanded');
  $dailyList.querySelectorAll('.daily-card').forEach(c => c.classList.remove('expanded'));
  if (!isExpanded) card.classList.add('expanded');
});

// ── Sports ───────────────────────────────────────────────

const MN_TEAMS = [
  { sport: 'baseball',   league: 'mlb', abbr: 'min', name: 'Minnesota Twins',        emoji: '⚾' },
  { sport: 'basketball', league: 'nba', abbr: 'min', name: 'Minnesota Timberwolves', emoji: '🏀' },
  { sport: 'hockey',     league: 'nhl', abbr: 'min', name: 'Minnesota Wild',          emoji: '🏒' },
];

const $sportsList = document.getElementById('sports-list');

async function fetchSports() {
  $sportsList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Fetching scores...</p></div>';

  const results = await Promise.allSettled(
    MN_TEAMS.map(team =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.abbr}/schedule`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    )
  );

  $sportsList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  results.forEach((result, i) => {
    const team = MN_TEAMS[i];
    const section = document.createElement('div');
    section.className = 'team-section';

    if (result.status === 'fulfilled') {
      renderTeamSection(section, team, result.value);
    } else {
      section.innerHTML = `
        <div class="team-header">
          <div class="team-header-left">
            <span class="team-emoji">${team.emoji}</span>
            <span class="team-name">${team.name}</span>
          </div>
        </div>
        <div class="team-error">Failed to load scores</div>
      `;
    }
    fragment.appendChild(section);
  });

  $sportsList.appendChild(fragment);
}

function renderTeamSection(section, team, data) {
  const events = Array.isArray(data.events) ? data.events : [];

  let record = '';
  const rec = data.team?.record?.items?.[0];
  if (rec) record = typeof rec.summary === 'string' ? rec.summary : '';

  const state = e => e.competitions?.[0]?.status?.type?.state;
  const completed  = events.filter(e => state(e) === 'post');
  const inProgress = events.filter(e => state(e) === 'in');
  const upcoming   = events.filter(e => state(e) === 'pre');

  const recentGames = completed.slice(-5).reverse();
  const nextGames   = upcoming.slice(0, 3);

  let html = `
    <div class="team-header">
      <div class="team-header-left">
        <span class="team-emoji">${team.emoji}</span>
        <span class="team-name">${team.name}</span>
      </div>
      ${record ? `<span class="team-record">${record}</span>` : ''}
    </div>
  `;

  inProgress.forEach(e => { html += renderGameRow(e, team.abbr, 'in', false, team.league, team.sport); });

  if (recentGames.length) {
    html += '<div class="games-group">';
    recentGames.forEach(e => { html += renderGameRow(e, team.abbr, 'post', false, team.league, team.sport); });
    html += '</div>';
  }

  if (nextGames.length) {
    html += '<div class="games-group upcoming-group">';
    nextGames.forEach((e, i) => { html += renderGameRow(e, team.abbr, 'pre', i === 0, team.league, team.sport); });
    html += '</div>';
  }

  if (!recentGames.length && !nextGames.length && !inProgress.length) {
    html += '<div class="team-no-games">No games to display</div>';
  }

  section.innerHTML = html;
}

function extractScore(score) {
  if (score == null) return '–';
  if (typeof score === 'string') return score;
  if (typeof score === 'number') return String(score);
  return String(score.displayValue ?? score.value ?? '–');
}

function getCompetitors(event, abbr) {
  const comp  = event.competitions?.[0];
  const comps = comp?.competitors || [];
  const upper = abbr.toUpperCase();
  const us   = comps.find(c => c.team?.abbreviation?.toUpperCase() === upper);
  const them = comps.find(c => c.team?.abbreviation?.toUpperCase() !== upper);
  return { comp, us, them };
}

function renderGameRow(event, abbr, state, isNext, league, sport) {
  try {
    const { comp, us, them } = getCompetitors(event, abbr);
    if (!us || !them) return '';

    const homeAway = us.homeAway === 'home' ? 'vs' : '@';
    const opponent = String(them.team?.shortDisplayName || them.team?.abbreviation || '?');
    const boxable  = (league === 'nba' || league === 'nhl') && (state === 'post' || state === 'in');

    if (state === 'post') {
      const won = us.winner === true;
      const ourScore   = extractScore(us.score);
      const theirScore = extractScore(them.score);
      const row = `
        <div class="game-row${boxable ? ' game-boxable' : ''}">
          <span class="game-result ${won ? 'win' : 'loss'}">${won ? 'W' : 'L'}</span>
          <span class="game-matchup">${homeAway} ${opponent}</span>
          <span class="game-score">${ourScore}–${theirScore}</span>
          <span class="game-date">${sportsFormatDate(event.date)}</span>
        </div>`;
      return boxable
        ? `<div class="game-wrap" data-event-id="${event.id}" data-sport="${sport}" data-league="${league}">${row}<div class="box-score-panel hidden"></div></div>`
        : row;
    }

    if (state === 'in') {
      const ourScore   = extractScore(us.score);
      const theirScore = extractScore(them.score);
      const status = String(comp?.status?.type?.shortDetail || 'Live');
      const row = `
        <div class="game-row game-live${boxable ? ' game-boxable' : ''}">
          <span class="game-result live">LIVE</span>
          <span class="game-matchup">${homeAway} ${opponent}</span>
          <span class="game-score">${ourScore}–${theirScore}</span>
          <span class="game-date">${status}</span>
        </div>`;
      return boxable
        ? `<div class="game-wrap" data-event-id="${event.id}" data-sport="${sport}" data-league="${league}">${row}<div class="box-score-panel hidden"></div></div>`
        : row;
    }

    // pre / upcoming
    return `
      <div class="game-row${isNext ? ' game-next' : ''}">
        <span class="game-result upcoming">${isNext ? 'NEXT' : 'UPC'}</span>
        <span class="game-matchup">${homeAway} ${opponent}</span>
        <span class="game-score"></span>
        <span class="game-date">${sportsFormatTime(event.date)}</span>
      </div>`;
  } catch (err) {
    console.error('renderGameRow error:', err, event);
    return '';
  }
}

async function fetchBoxScore(eventId, sport, league) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${eventId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderBoxScore(data) {
  const players = data?.boxscore?.players;
  if (!players?.length) return '<div class="bs-empty">No box score available</div>';

  return players.map(teamData => {
    const abbr       = teamData.team?.abbreviation || '?';
    const allStats   = teamData.statistics || [];
    if (!allStats.length) return '';

    // Column names are the same across all groups; use the first group's names
    const names  = allStats[0].names || [];
    const minIdx = names.indexOf('MIN');
    const ptsIdx = names.indexOf('PTS');
    const rebIdx = names.indexOf('REB');
    const astIdx = names.indexOf('AST');
    const stlIdx = names.indexOf('STL');
    const blkIdx = names.indexOf('BLK');

    // ESPN orders starters first (statistics[0]) then bench (statistics[1])
    const athletes = allStats
      .flatMap(s => s.athletes || [])
      .filter(a => a.stats?.length && a.stats[minIdx] !== '0:00' && a.stats[minIdx] !== '0')
      .slice(0, 8);

    const rows = athletes.map(a => {
      const s    = a.stats;
      const name = a.athlete?.shortName || a.athlete?.displayName || '?';
      return `
        <div class="bs-row">
          <span class="bs-name">${name}</span>
          <span>${s[minIdx] || '--'}</span>
          <span>${s[ptsIdx] || '0'}</span>
          <span>${s[rebIdx] || '0'}</span>
          <span>${s[astIdx] || '0'}</span>
          <span>${s[stlIdx] || '0'}/${s[blkIdx] || '0'}</span>
        </div>`;
    }).join('');

    return `
      <div class="bs-team">
        <div class="bs-header">
          <span class="bs-team-abbr">${abbr}</span>
          <span>MIN</span><span>PTS</span><span>REB</span><span>AST</span><span>S/B</span>
        </div>
        ${rows}
      </div>`;
  }).join('<div class="bs-divider"></div>');
}

function renderBoxScoreHockey(data) {
  const players = data?.boxscore?.players;
  console.log('NHL groups:', players?.[0]?.statistics?.map(s => ({ keys: s.keys, labels: s.labels, text: s.text, names: s.names, sample: s.athletes?.[0]?.stats })));
  if (!players?.length) return '<div class="bs-empty">No box score available</div>';

  return players.map(teamData => {
    const abbr     = teamData.team?.abbreviation || '?';
    const allStats = teamData.statistics || [];
    if (!allStats.length) return '';

    // ESPN splits skaters and goalies into separate groups by stat columns
    const skaterGroups = allStats.filter(s => !(s.names || []).includes('SV'));
    const goalieGroups = allStats.filter(s =>  (s.names || []).includes('SV'));

    const sNames = skaterGroups[0]?.names || [];
    const gIdx   = sNames.indexOf('G');
    const aIdx   = sNames.indexOf('A');
    const ptsIdx = sNames.indexOf('PTS');
    const pmIdx  = sNames.indexOf('+/-');
    const sIdx   = sNames.indexOf('S');
    const toiIdx = sNames.indexOf('TOI');

    const skaters = skaterGroups
      .flatMap(sg => sg.athletes || [])
      .filter(a => a.stats?.length && a.stats[toiIdx] !== '00:00' && a.stats[toiIdx] !== '0:00')
      .sort((a, b) => parseInt(b.stats[ptsIdx] || 0) - parseInt(a.stats[ptsIdx] || 0)
                   || parseInt(b.stats[sIdx]   || 0) - parseInt(a.stats[sIdx]   || 0))
      .slice(0, 8);

    const skaterRows = skaters.map(a => {
      const s    = a.stats;
      const name = a.athlete?.shortName || a.athlete?.displayName || '?';
      return `
        <div class="bs-row">
          <span class="bs-name">${name}</span>
          <span>${s[gIdx]   || '0'}</span>
          <span>${s[aIdx]   || '0'}</span>
          <span>${s[pmIdx]  || '0'}</span>
          <span>${s[sIdx]   || '0'}</span>
          <span>${s[toiIdx] || '--'}</span>
        </div>`;
    }).join('');

    const gNames  = goalieGroups[0]?.names || [];
    const saIdx   = gNames.indexOf('SA');
    const svIdx   = gNames.indexOf('SV');
    const gaIdx   = gNames.indexOf('GA');
    const svpIdx  = gNames.indexOf('SV%');
    const gToiIdx = gNames.indexOf('TOI');

    const goalies = goalieGroups
      .flatMap(gg => gg.athletes || [])
      .filter(a => a.stats?.length);

    const goalieRows = goalies.map(a => {
      const s    = a.stats;
      const name = a.athlete?.shortName || a.athlete?.displayName || '?';
      return `
        <div class="bs-row">
          <span class="bs-name">${name}</span>
          <span>${s[saIdx]   || '--'}</span>
          <span>${s[svIdx]   || '--'}</span>
          <span>${s[gaIdx]   || '--'}</span>
          <span>${s[svpIdx]  || '--'}</span>
          <span>${s[gToiIdx] || '--'}</span>
        </div>`;
    }).join('');

    return `
      <div class="bs-team">
        <div class="bs-header">
          <span class="bs-team-abbr">${abbr}</span>
          <span>G</span><span>A</span><span>+/-</span><span>S</span><span>TOI</span>
        </div>
        ${skaterRows}
        ${goalieRows ? `<div class="bs-subheader">Goalies</div>
        <div class="bs-header">
          <span class="bs-team-abbr"></span>
          <span>SA</span><span>SV</span><span>GA</span><span>SV%</span><span>TOI</span>
        </div>
        ${goalieRows}` : ''}
      </div>`;
  }).join('<div class="bs-divider"></div>');
}

$sportsList.addEventListener('click', async e => {
  const wrap = e.target.closest('.game-wrap');
  if (!wrap) return;

  const panel      = wrap.querySelector('.box-score-panel');
  const isOpen     = !panel.classList.contains('hidden');

  // Collapse any other open panels
  $sportsList.querySelectorAll('.box-score-panel:not(.hidden)')
    .forEach(p => p.classList.add('hidden'));

  if (isOpen) return;

  panel.innerHTML = '<div class="bs-loading">Loading box score…</div>';
  panel.classList.remove('hidden');

  try {
    const { eventId, sport, league } = wrap.dataset;
    const data = await fetchBoxScore(eventId, sport, league);
    panel.innerHTML = league === 'nhl' ? renderBoxScoreHockey(data) : renderBoxScore(data);
  } catch (err) {
    panel.innerHTML = '<div class="bs-empty">Failed to load box score</div>';
    console.error('Box score fetch failed:', err);
  }
});

function sportsFormatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - gameDay) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function sportsFormatTime(isoStr) {
  if (!isoStr) return 'TBD';
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((gameDay - today) / 86400000);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE });
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${time}`;
}

// ── Planets ───────────────────────────────────────────────

const PLANET_LIST = [
  { name: 'Mercury', body: Astronomy.Body.Mercury, symbol: '☿' },
  { name: 'Venus',   body: Astronomy.Body.Venus,   symbol: '♀' },
  { name: 'Mars',    body: Astronomy.Body.Mars,     symbol: '♂' },
  { name: 'Jupiter', body: Astronomy.Body.Jupiter,  symbol: '♃' },
  { name: 'Saturn',  body: Astronomy.Body.Saturn,   symbol: '♄' },
];

function fmtTime(date) {
  if (!date) return '--';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE
  });
}

function getPlanetVisibility(riseDate, setDate, astroDusk, astroDawn) {
  if (!riseDate || !setDate || !astroDusk || !astroDawn) {
    return { visible: false, msg: 'Data unavailable' };
  }
  const rise = riseDate.getTime();
  const set  = setDate.getTime();
  const dusk = astroDusk.getTime();
  const dawn = astroDawn.getTime();

  if (rise > set) {
    // Planet is currently up, will set then rise again
    if (set > dusk && set < dawn) {
      return { visible: true,  msg: `Visible until ${fmtTime(setDate)}` };
    } else if (rise >= dusk && rise < dawn) {
      return { visible: true,  msg: `Rises at ${fmtTime(riseDate)}` };
    } else if (set < dusk && rise >= dawn) {
      return { visible: false, msg: 'Sets before dark, rises after dawn' };
    } else if (set >= dawn) {
      return { visible: true,  msg: 'Visible all night' };
    } else {
      return { visible: false, msg: 'Not during darkness' };
    }
  } else {
    // Normal: rise < set
    if (rise < dusk) {
      if (set > dusk) {
        return set < dawn
          ? { visible: true,  msg: `Visible until ${fmtTime(setDate)}` }
          : { visible: true,  msg: 'Visible all night' };
      } else {
        return { visible: false, msg: `Sets at ${fmtTime(setDate)}, before dark` };
      }
    } else if (rise >= dusk && rise < dawn) {
      return set < dawn
        ? { visible: true, msg: `${fmtTime(riseDate)} – ${fmtTime(setDate)}` }
        : { visible: true, msg: `Rises ${fmtTime(riseDate)} until dawn` };
    } else {
      return { visible: false, msg: 'Rises after dawn' };
    }
  }
}

function renderPlanets() {
  const $list = document.getElementById('planets-list');
  const now  = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const noon     = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const obs = new Astronomy.Observer(LAT, LON, 264);

  // Sun rise/set (search from midnight for rise, noon for set)
  const sunRise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, midnight, 1);
  const sunSet  = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, noon,     1);

  // Tonight's twilight: dusk from noon forward, dawn from dusk forward
  const civilDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, noon, 1, -6);
  const civilDawn = civilDusk
    ? Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, +1, civilDusk.date, 1, -6)
    : null;
  const astroDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, -1, noon, 1, -18);
  const astroDawn = astroDusk
    ? Astronomy.SearchAltitude(Astronomy.Body.Sun, obs, +1, astroDusk.date, 1, -18)
    : null;

  const astroDuskDate = astroDusk ? astroDusk.date : null;
  const astroDawnDate = astroDawn ? astroDawn.date : null;

  let html = `
    <div class="planet-sun-card">
      <div class="planet-group-title">🌅 Sun &amp; Twilight</div>
      <div class="sun-times">
        <div class="sun-row"><span>Sunset</span><span>${fmtTime(sunSet ? sunSet.date : null)}</span></div>
        <div class="sun-row sun-divider"><span>Civil dusk</span><span>${fmtTime(civilDusk ? civilDusk.date : null)}</span></div>
        <div class="sun-row"><span>Astro dusk</span><span>${fmtTime(astroDuskDate)}</span></div>
        <div class="sun-row"><span>Astro dawn</span><span>${fmtTime(astroDawnDate)}</span></div>
        <div class="sun-row"><span>Civil dawn</span><span>${fmtTime(civilDawn ? civilDawn.date : null)}</span></div>
        <div class="sun-row sun-divider"><span>Sunrise</span><span>${fmtTime(sunRise ? sunRise.date : null)}</span></div>
      </div>
    </div>
  `;

  for (const { name, body, symbol } of PLANET_LIST) {
    try {
      const rise    = Astronomy.SearchRiseSet(body, obs, +1, now, 2);
      const set     = Astronomy.SearchRiseSet(body, obs, -1, now, 2);
      const transit = Astronomy.SearchHourAngle(body, obs, 0, now, +1);

      const riseDate    = rise    ? rise.date          : null;
      const setDate     = set     ? set.date           : null;
      const transitDate = transit ? transit.time.date  : null;

      const equ = Astronomy.Equator(body, now, obs, true, true);
      const hor = Astronomy.Horizon(now, obs, equ.ra, equ.dec, 'normal');
      const alt = hor.altitude;
      const isUp = alt > 0;

      const vis = getPlanetVisibility(riseDate, setDate, astroDuskDate, astroDawnDate);

      html += `
        <div class="planet-card">
          <div class="planet-card-header">
            <span class="planet-symbol">${symbol}</span>
            <span class="planet-name">${name}</span>
            <span class="planet-alt ${isUp ? 'alt-up' : 'alt-down'}">${isUp ? '▲' : '▼'} ${Math.abs(alt).toFixed(1)}°</span>
          </div>
          <div class="planet-times-row">
            <div class="planet-time"><div class="pt-label">Rise</div><div>${fmtTime(riseDate)}</div></div>
            <div class="planet-time"><div class="pt-label">Transit</div><div>${fmtTime(transitDate)}</div></div>
            <div class="planet-time"><div class="pt-label">Set</div><div>${fmtTime(setDate)}</div></div>
          </div>
          <div class="planet-vis ${vis.visible ? 'vis-yes' : 'vis-no'}">
            ${vis.visible ? '★' : '✗'} ${vis.msg}
          </div>
        </div>
      `;
    } catch (e) {
      console.error(`Planet error (${name}):`, e);
      html += `
        <div class="planet-card">
          <div class="planet-card-header">
            <span class="planet-symbol">${symbol}</span>
            <span class="planet-name">${name}</span>
          </div>
          <div class="planet-vis vis-no">Data unavailable</div>
        </div>
      `;
    }
  }

  $list.innerHTML = html;
}

// ── Init ──────────────────────────────────────────────────
$retryBtn.addEventListener('click', fetchWeather);

document.addEventListener('deviceready', () => {
  fetchWeather();
  fetchSports();
  renderPlanets();
}, false);

// Also run immediately for browser testing (no Cordova deviceready)
if (!window.cordova) {
  fetchWeather();
  fetchSports();
  renderPlanets();
}
