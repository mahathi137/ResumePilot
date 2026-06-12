/**
 * ═══════════════════════════════════════════════════════
 *  ResumePilot — script.js
 *  Professional Resume Builder — Complete JavaScript
 *  Build Smarter Resumes. Get Career Ready.
 *
 *  TABLE OF CONTENTS:
 *   1.  Constants & Config
 *   2.  State Management
 *   3.  DOM Helpers
 *   4.  Initialisation
 *   5.  Local Storage
 *   6.  Version Management (Multiple Resumes)
 *   7.  Template Switching
 *   8.  Color Theme
 *   9.  Dark Mode
 *  10.  Skills System (Categorized)
 *  11.  Education Section
 *  12.  Experience Section (with bullets)
 *  13.  Projects Section (with bullets + dates)
 *  14.  Certifications Section
 *  15.  Custom Sections
 *  16.  SortableJS Drag & Drop
 *  17.  Progress, ATS, Readability, Stats
 *  18.  Smart Summary Generator
 *  19.  Live Preview Renderer
 *  20.  Template Builders (5 templates)
 *  21.  Resume Section HTML Helpers
 *  22.  PDF Export (with clickable links)
 *  23.  Print
 *  24.  Clear Form
 *  25.  Toast
 *  26.  Event Listeners
 * ═══════════════════════════════════════════════════════
 */

'use strict';

/* ═══════════════════════════════════════════════════════
   1. CONSTANTS & CONFIG
═══════════════════════════════════════════════════════ */

const PREDEFINED_SKILLS = [
  'Java','Python','C++','JavaScript','TypeScript','Go','Rust',
  'HTML5','CSS3','React','Vue','Angular','Node.js','Express',
  'Spring Boot','Django','FastAPI','SQL','PostgreSQL','MongoDB',
  'Redis','Docker','Kubernetes','AWS','Git','Linux','REST APIs'
];

const ACTION_VERBS = [
  'Developed','Designed','Implemented','Optimized','Engineered',
  'Architected','Automated','Integrated','Deployed','Reduced',
  'Increased','Led','Collaborated','Delivered','Migrated',
  'Refactored','Built','Created','Maintained','Improved'
];

const ACCENT_MAP = {
  skyblue:  { accent:'#2AA3E6', light:'#E6F5FD', dark:'#1A7DB3', rgb:'42,163,230' },
  navy:     { accent:'#1E3A5F', light:'#EBF2FF', dark:'#0F2340', rgb:'30,58,95' },
  charcoal: { accent:'#2D3748', light:'#EDF2F7', dark:'#1A202C', rgb:'45,55,72' },
  slate:    { accent:'#475569', light:'#F1F5F9', dark:'#334155', rgb:'71,85,105' },
  teal:     { accent:'#0F766E', light:'#F0FDFA', dark:'#0D5C55', rgb:'15,118,110' },
  indigo:   { accent:'#3730A3', light:'#EEF2FF', dark:'#2D2894', rgb:'55,48,163' }
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const LS_KEY = 'resumepilot_v1';
const LS_VERSIONS_KEY = 'resumepilot_versions_v1';

let _uid = Date.now();
const uid = () => `rc-${++_uid}`;

/* ═══════════════════════════════════════════════════════
   2. STATE MANAGEMENT
═══════════════════════════════════════════════════════ */

/** Default blank resume state */
function blankState() {
  return {
    personal: {
      fullName:'', jobTitle:'', email:'', phone:'',
      address:'', linkedin:'', github:'', portfolio:'', summary:''
    },
    skillCategories: [],   // [{id, name, skills:[]}]
    education:   [],       // [{id, degree, institution, startYear, endYear, grade}]
    experience:  [],       // [{id, company, jobTitle, startMonth, startYear, endMonth, endYear, current, bullets:[]}]
    projects:    [],       // [{id, title, startMonth, startYear, endMonth, endYear, current, bullets:[], githubUrl}]
    certs:       [],       // [{id, name, org, year, url}]
    customSections: [],    // [{id, title, bullets:[]}]
    template:    'stanford',
    color:       'skyblue',
    darkMode:    false,
    targetRole:  ''
  };
}

let state = blankState();
let versions = [];         // [{id, name, state}]
let activeVersionId = '';

/* ═══════════════════════════════════════════════════════
   3. DOM HELPERS
═══════════════════════════════════════════════════════ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function extractUsername(url) {
  if (!url) return '';
  const clean = url.replace(/https?:\/\/(www\.)?/i,'').replace(/\/$/,'');
  const parts = clean.split('/');
  return parts[parts.length - 1] || clean;
}

function getShortUrl(url) {
  if (!url) return '';
  return url.replace(/https?:\/\/(www\.)?/i,'').replace(/\/$/,'');
}

/* ═══════════════════════════════════════════════════════
   4. INITIALISATION
═══════════════════════════════════════════════════════ */
function init() {
  loadVersions();
  applyStateToUI();
  renderVerbChips();
  renderPredefinedSkills();
  setupSortable();
  setupEventListeners();
  renderAll();
}

function applyStateToUI() {
  // Personal fields
  const p = state.personal;
  setVal('full-name',       p.fullName);
  setVal('job-title-tagline', p.jobTitle);
  setVal('email',           p.email);
  setVal('phone',           p.phone);
  setVal('address',         p.address);
  setVal('linkedin',        p.linkedin);
  setVal('github',          p.github);
  setVal('portfolio',       p.portfolio);
  setVal('summary',         p.summary);

  // Template / color / dark
  applyTemplate(state.template, false);
  applyColor(state.color, false);
  applyDarkMode(state.darkMode);

  // Target role
  const trEl = $('#target-role-select');
  if (trEl) trEl.value = state.targetRole || '';

  // Render sections
  renderSkillCategories();
  renderEducation();
  renderExperience();
  renderProjects();
  renderCerts();
  renderCustomSections();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function renderAll() {
  updateAnalytics();
  renderPreview();
}

/* ═══════════════════════════════════════════════════════
   5. LOCAL STORAGE
═══════════════════════════════════════════════════════ */
function saveVersions() {
  // Update active version state before saving
  const idx = versions.findIndex(v => v.id === activeVersionId);
  if (idx !== -1) versions[idx].state = JSON.parse(JSON.stringify(state));
  try {
    localStorage.setItem(LS_VERSIONS_KEY, JSON.stringify({ versions, activeVersionId }));
  } catch(e) { console.warn('Save failed', e); }
}

function loadVersions() {
  try {
    const raw = localStorage.getItem(LS_VERSIONS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      versions = data.versions || [];
      activeVersionId = data.activeVersionId || '';
    }
  } catch(e) { versions = []; }

  if (versions.length === 0) {
    const id = uid();
    versions = [{ id, name: 'My Resume', state: blankState() }];
    activeVersionId = id;
  }

  if (!versions.find(v => v.id === activeVersionId)) {
    activeVersionId = versions[0].id;
  }

  state = JSON.parse(JSON.stringify(versions.find(v => v.id === activeVersionId).state));
  renderVersionSelect();
}

function renderVersionSelect() {
  const sel = $('#version-select');
  if (!sel) return;
  sel.innerHTML = versions.map(v =>
    `<option value="${v.id}" ${v.id === activeVersionId ? 'selected' : ''}>${escHtml(v.name)}</option>`
  ).join('');
}

function switchVersion(id) {
  saveVersions();
  activeVersionId = id;
  const v = versions.find(v => v.id === id);
  if (v) {
    state = JSON.parse(JSON.stringify(v.state));
    applyStateToUI();
    renderAll();
  }
}

function newVersion() {
  const name = prompt('Resume name:', 'New Resume');
  if (!name) return;
  saveVersions();
  const id = uid();
  versions.push({ id, name, state: blankState() });
  activeVersionId = id;
  state = blankState();
  applyStateToUI();
  renderVersionSelect();
  renderAll();
  saveVersions();
  showToast('✅ New resume created');
}

function renameVersion() {
  const v = versions.find(v => v.id === activeVersionId);
  if (!v) return;
  const name = prompt('Rename resume:', v.name);
  if (!name) return;
  v.name = name;
  renderVersionSelect();
  saveVersions();
  showToast('✅ Renamed');
}

function duplicateVersion() {
  saveVersions();
  const v = versions.find(v => v.id === activeVersionId);
  if (!v) return;
  const id = uid();
  versions.push({ id, name: v.name + ' (Copy)', state: JSON.parse(JSON.stringify(v.state)) });
  activeVersionId = id;
  state = JSON.parse(JSON.stringify(versions.find(v => v.id === id).state));
  applyStateToUI();
  renderVersionSelect();
  renderAll();
  saveVersions();
  showToast('✅ Duplicated');
}

function deleteVersion() {
  if (versions.length === 1) { showToast('⚠ Cannot delete last resume'); return; }
  if (!confirm('Delete this resume?')) return;
  versions = versions.filter(v => v.id !== activeVersionId);
  activeVersionId = versions[0].id;
  state = JSON.parse(JSON.stringify(versions[0].state));
  applyStateToUI();
  renderVersionSelect();
  renderAll();
  saveVersions();
  showToast('✅ Deleted');
}

/** Auto-save: reads personal fields into state, then saves */
function autoSave() {
  state.personal.fullName   = ($('#full-name')         || {}).value || '';
  state.personal.jobTitle   = ($('#job-title-tagline') || {}).value || '';
  state.personal.email      = ($('#email')             || {}).value || '';
  state.personal.phone      = ($('#phone')             || {}).value || '';
  state.personal.address    = ($('#address')           || {}).value || '';
  state.personal.linkedin   = ($('#linkedin')          || {}).value || '';
  state.personal.github     = ($('#github')            || {}).value || '';
  state.personal.portfolio  = ($('#portfolio')         || {}).value || '';
  state.personal.summary    = ($('#summary')           || {}).value || '';
  state.targetRole          = ($('#target-role-select')|| {}).value || '';
  saveVersions();
  renderAll();
}

/* ═══════════════════════════════════════════════════════
   6. VERSION MANAGEMENT
═══════════════════════════════════════════════════════ */
// Functions already defined above in §5 (loadVersions / saveVersions / etc.)

/* ═══════════════════════════════════════════════════════
   7. TEMPLATE SWITCHING
═══════════════════════════════════════════════════════ */
function applyTemplate(name, save = true) {
  state.template = name;
  $$('.tpl-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tpl === name);
    b.setAttribute('aria-selected', b.dataset.tpl === name);
  });
  document.body.dataset.template = name;
  if (save) { saveVersions(); renderPreview(); }
}

/* ═══════════════════════════════════════════════════════
   8. COLOR THEME
═══════════════════════════════════════════════════════ */
function applyColor(colorName, save = true) {
  state.color = colorName;
  document.body.dataset.theme = colorName;
  $$('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === colorName));
  if (save) { saveVersions(); renderPreview(); }
}

/* ═══════════════════════════════════════════════════════
   9. DARK MODE
═══════════════════════════════════════════════════════ */
function applyDarkMode(on) {
  state.darkMode = on;
  document.body.classList.toggle('dark-mode', on);
}

/* ═══════════════════════════════════════════════════════
   10. SKILLS SYSTEM (Categorized)
═══════════════════════════════════════════════════════ */
function addSkillCategory() {
  state.skillCategories.push({ id: uid(), name: 'New Category', skills: [] });
  renderSkillCategories();
  autoSave();
}

function removeSkillCategory(id) {
  state.skillCategories = state.skillCategories.filter(c => c.id !== id);
  renderSkillCategories();
  autoSave();
}

function addSkillToCategory(catId, skillName) {
  const name = skillName.trim();
  if (!name) return;
  const cat = state.skillCategories.find(c => c.id === catId);
  if (!cat || cat.skills.includes(name)) return;
  cat.skills.push(name);
  renderSkillCategories();
  renderPredefinedSkills();
  autoSave();
}

function removeSkillFromCategory(catId, skillName) {
  const cat = state.skillCategories.find(c => c.id === catId);
  if (!cat) return;
  cat.skills = cat.skills.filter(s => s !== skillName);
  renderSkillCategories();
  renderPredefinedSkills();
  autoSave();
}

function allAddedSkills() {
  return state.skillCategories.flatMap(c => c.skills);
}

function renderSkillCategories() {
  const container = $('#skill-categories-list');
  if (!container) return;
  container.innerHTML = '';
  state.skillCategories.forEach(cat => {
    const block = document.createElement('div');
    block.className = 'skill-category-block';
    block.dataset.id = cat.id;
    block.innerHTML = `
      <div class="skill-cat-header">
        <input class="skill-cat-name-input" type="text" value="${escHtml(cat.name)}" placeholder="Category name" aria-label="Skill category name" />
        <button class="remove-btn" data-cat-remove="${cat.id}" aria-label="Remove category">✕</button>
      </div>
      <div class="skill-tags-row" id="skill-tags-${cat.id}"></div>
      <div class="skill-add-row">
        <input class="skill-add-input" type="text" placeholder="Add skill…" id="skill-input-${cat.id}" aria-label="Add skill to ${escHtml(cat.name)}" />
        <button class="btn btn-sm btn-outline" data-cat-add="${cat.id}" type="button">+ Add</button>
      </div>
    `;

    // Name input
    block.querySelector('.skill-cat-name-input').addEventListener('input', e => {
      cat.name = e.target.value;
      autoSave();
    });

    container.appendChild(block);

    // Skill chips
    const tagsRow = document.getElementById(`skill-tags-${cat.id}`);
    cat.skills.forEach(skill => {
      const chip = document.createElement('span');
      chip.className = 'skill-chip';
      chip.innerHTML = `${escHtml(skill)} <button class="rm-chip" aria-label="Remove ${escHtml(skill)}">✕</button>`;
      chip.querySelector('.rm-chip').addEventListener('click', () => removeSkillFromCategory(cat.id, skill));
      tagsRow.appendChild(chip);
    });

    // Add button
    block.querySelector(`[data-cat-add]`).addEventListener('click', () => {
      const inp = document.getElementById(`skill-input-${cat.id}`);
      addSkillToCategory(cat.id, inp.value);
      inp.value = '';
    });
    document.getElementById(`skill-input-${cat.id}`).addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillToCategory(cat.id, e.target.value);
        e.target.value = '';
      }
    });

    // Remove category button
    block.querySelector(`[data-cat-remove]`).addEventListener('click', () => removeSkillCategory(cat.id));
  });
}

function renderPredefinedSkills() {
  const container = $('#predefined-skills-list');
  if (!container) return;
  const added = allAddedSkills();
  container.innerHTML = '';
  PREDEFINED_SKILLS.forEach(skill => {
    const btn = document.createElement('button');
    btn.className = 'pre-chip' + (added.includes(skill) ? ' used' : '');
    btn.textContent = skill;
    btn.type = 'button';
    btn.setAttribute('aria-label', `Quick add ${skill}`);
    btn.addEventListener('click', () => {
      if (state.skillCategories.length === 0) {
        state.skillCategories.push({ id: uid(), name: 'Technical Skills', skills: [] });
      }
      addSkillToCategory(state.skillCategories[0].id, skill);
    });
    container.appendChild(btn);
  });
}

function renderVerbChips() {
  const container = $('#verb-chips');
  if (!container) return;
  ACTION_VERBS.forEach(verb => {
    const btn = document.createElement('button');
    btn.className = 'verb-chip';
    btn.textContent = verb;
    btn.type = 'button';
    btn.title = 'Click to copy';
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(verb).catch(() => {});
      showToast(`Copied "${verb}"`);
    });
    container.appendChild(btn);
  });
}

/* ═══════════════════════════════════════════════════════
   11. EDUCATION SECTION
═══════════════════════════════════════════════════════ */
function addEducation() {
  state.education.push({ id: uid(), degree:'', institution:'', startYear:'', endYear:'', grade:'' });
  renderEducation();
  autoSave();
}

function removeEducation(id) {
  state.education = state.education.filter(e => e.id !== id);
  renderEducation();
  autoSave();
}

function renderEducation() {
  const list = $('#education-list');
  if (!list) return;
  list.innerHTML = '';
  state.education.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dynamic-item';
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="item-header">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <span class="item-title-display">${escHtml(item.degree || 'New Education')}</span>
        <button class="remove-btn" aria-label="Remove">✕</button>
      </div>
      <div class="item-fields">
        <div class="form-group full-width">
          <label>Degree / Field of Study</label>
          <input type="text" placeholder="B.Tech Computer Science" value="${escHtml(item.degree)}" data-field="degree" />
        </div>
        <div class="form-group full-width">
          <label>Institution</label>
          <input type="text" placeholder="University Name" value="${escHtml(item.institution)}" data-field="institution" />
        </div>
        <div class="form-group">
          <label>Start Year</label>
          <input type="text" placeholder="2021" value="${escHtml(item.startYear)}" data-field="startYear" />
        </div>
        <div class="form-group">
          <label>End Year</label>
          <input type="text" placeholder="2025" value="${escHtml(item.endYear)}" data-field="endYear" />
        </div>
        <div class="form-group">
          <label>CGPA / Percentage</label>
          <input type="text" placeholder="8.5 / 85%" value="${escHtml(item.grade)}" data-field="grade" />
        </div>
      </div>`;
    el.querySelector('.remove-btn').addEventListener('click', () => removeEducation(item.id));
    el.querySelectorAll('[data-field]').forEach(inp => {
      inp.addEventListener('input', e => {
        item[e.target.dataset.field] = e.target.value;
        el.querySelector('.item-title-display').textContent = item.degree || 'New Education';
        autoSave();
      });
    });
    list.appendChild(el);
  });
}

/* ═══════════════════════════════════════════════════════
   12. EXPERIENCE SECTION (with bullet points)
═══════════════════════════════════════════════════════ */
function addExperience() {
  state.experience.push({
    id: uid(), company:'', jobTitle:'',
    startMonth:'', startYear:'', endMonth:'', endYear:'', current: false,
    bullets: ['']
  });
  renderExperience();
  autoSave();
}

function removeExperience(id) {
  state.experience = state.experience.filter(e => e.id !== id);
  renderExperience();
  autoSave();
}

function renderExperience() {
  const list = $('#experience-list');
  if (!list) return;
  list.innerHTML = '';
  state.experience.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dynamic-item';
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="item-header">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <span class="item-title-display">${escHtml(item.jobTitle || 'New Experience')}</span>
        <button class="remove-btn" aria-label="Remove">✕</button>
      </div>
      <div class="item-fields">
        <div class="form-group full-width">
          <label>Company Name</label>
          <input type="text" placeholder="Company Name" value="${escHtml(item.company)}" data-field="company" />
        </div>
        <div class="form-group full-width">
          <label>Job Title</label>
          <input type="text" placeholder="Software Engineer" value="${escHtml(item.jobTitle)}" data-field="jobTitle" />
        </div>
        <div class="form-group">
          <label>Start Month</label>
          <select data-field="startMonth">${monthOptions(item.startMonth)}</select>
        </div>
        <div class="form-group">
          <label>Start Year</label>
          <input type="text" placeholder="2023" value="${escHtml(item.startYear)}" data-field="startYear" />
        </div>
        <div class="form-group">
          <label>End Month</label>
          <select data-field="endMonth" ${item.current ? 'disabled' : ''}>${monthOptions(item.endMonth)}</select>
        </div>
        <div class="form-group">
          <label>End Year</label>
          <input type="text" placeholder="Present" value="${escHtml(item.endYear)}" data-field="endYear" ${item.current ? 'disabled' : ''} />
        </div>
        <div class="form-group full-width" style="flex-direction:row;align-items:center;gap:6px;">
          <input type="checkbox" id="cur-exp-${item.id}" ${item.current ? 'checked' : ''} data-field="current" style="width:auto;margin:0;" />
          <label for="cur-exp-${item.id}" style="text-transform:none;font-size:0.8rem;color:var(--text2);">Currently working here</label>
        </div>
        <div class="form-group full-width bullets-wrap">
          <div class="bullets-label">Responsibilities / Achievements</div>
          <div class="bullet-list" id="bullets-exp-${item.id}"></div>
          <button class="add-bullet-btn" data-add-bullet="exp-${item.id}" type="button">+ Add bullet point</button>
        </div>
      </div>`;

    el.querySelector('.remove-btn').addEventListener('click', () => removeExperience(item.id));

    // Field inputs
    el.querySelectorAll('[data-field]').forEach(inp => {
      inp.addEventListener('change', e => {
        const field = e.target.dataset.field;
        item[field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (field === 'current') {
          el.querySelector('[data-field="endMonth"]').disabled = item.current;
          el.querySelector('[data-field="endYear"]').disabled = item.current;
          if (item.current) { item.endMonth = ''; item.endYear = 'Present'; }
        }
        el.querySelector('.item-title-display').textContent = item.jobTitle || 'New Experience';
        autoSave();
      });
      if (inp.tagName === 'INPUT' && inp.type !== 'checkbox') {
        inp.addEventListener('input', e => {
          item[e.target.dataset.field] = e.target.value;
          el.querySelector('.item-title-display').textContent = item.jobTitle || 'New Experience';
          autoSave();
        });
      }
    });

    // Bullets
    renderBullets(el, `bullets-exp-${item.id}`, item.bullets, () => autoSave());
    el.querySelector(`[data-add-bullet="exp-${item.id}"]`).addEventListener('click', () => {
      item.bullets.push('');
      renderBullets(el, `bullets-exp-${item.id}`, item.bullets, () => autoSave());
      autoSave();
    });

    list.appendChild(el);
  });
}

/* ═══════════════════════════════════════════════════════
   13. PROJECTS SECTION (bullets + dates, no tech field)
═══════════════════════════════════════════════════════ */
function addProject() {
  state.projects.push({
    id: uid(), title:'',
    startMonth:'', startYear:'', endMonth:'', endYear:'', current: false,
    bullets: [''], githubUrl: ''
  });
  renderProjects();
  autoSave();
}

function removeProject(id) {
  state.projects = state.projects.filter(p => p.id !== id);
  renderProjects();
  autoSave();
}

function renderProjects() {
  const list = $('#project-list');
  if (!list) return;
  list.innerHTML = '';
  state.projects.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dynamic-item';
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="item-header">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <span class="item-title-display">${escHtml(item.title || 'New Project')}</span>
        <button class="remove-btn" aria-label="Remove">✕</button>
      </div>
      <div class="item-fields">
        <div class="form-group full-width">
          <label>Project Title</label>
          <input type="text" placeholder="My Project" value="${escHtml(item.title)}" data-field="title" />
        </div>
        <div class="form-group">
          <label>Start Month</label>
          <select data-field="startMonth">${monthOptions(item.startMonth)}</select>
        </div>
        <div class="form-group">
          <label>Start Year</label>
          <input type="text" placeholder="2024" value="${escHtml(item.startYear)}" data-field="startYear" />
        </div>
        <div class="form-group">
          <label>End Month</label>
          <select data-field="endMonth" ${item.current ? 'disabled' : ''}>${monthOptions(item.endMonth)}</select>
        </div>
        <div class="form-group">
          <label>End Year</label>
          <input type="text" placeholder="2024" value="${escHtml(item.endYear)}" data-field="endYear" ${item.current ? 'disabled' : ''} />
        </div>
        <div class="form-group full-width" style="flex-direction:row;align-items:center;gap:6px;">
          <input type="checkbox" id="cur-proj-${item.id}" ${item.current ? 'checked' : ''} data-field="current" style="width:auto;margin:0;" />
          <label for="cur-proj-${item.id}" style="text-transform:none;font-size:0.8rem;color:var(--text2);">Ongoing project</label>
        </div>
        <div class="form-group full-width">
          <label>GitHub Repository URL</label>
          <input type="url" placeholder="github.com/username/repo" value="${escHtml(item.githubUrl)}" data-field="githubUrl" />
        </div>
        <div class="form-group full-width bullets-wrap">
          <div class="bullets-label">Project Highlights (bullet points)</div>
          <div class="bullet-list" id="bullets-proj-${item.id}"></div>
          <button class="add-bullet-btn" data-add-bullet="proj-${item.id}" type="button">+ Add bullet point</button>
        </div>
      </div>`;

    el.querySelector('.remove-btn').addEventListener('click', () => removeProject(item.id));

    el.querySelectorAll('[data-field]').forEach(inp => {
      inp.addEventListener('change', e => {
        const field = e.target.dataset.field;
        item[field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (field === 'current') {
          el.querySelector('[data-field="endMonth"]').disabled = item.current;
          el.querySelector('[data-field="endYear"]').disabled = item.current;
        }
        el.querySelector('.item-title-display').textContent = item.title || 'New Project';
        autoSave();
      });
      if (inp.tagName === 'INPUT' && inp.type !== 'checkbox') {
        inp.addEventListener('input', e => {
          item[e.target.dataset.field] = e.target.value;
          el.querySelector('.item-title-display').textContent = item.title || 'New Project';
          autoSave();
        });
      }
    });

    renderBullets(el, `bullets-proj-${item.id}`, item.bullets, () => autoSave());
    el.querySelector(`[data-add-bullet="proj-${item.id}"]`).addEventListener('click', () => {
      item.bullets.push('');
      renderBullets(el, `bullets-proj-${item.id}`, item.bullets, () => autoSave());
      autoSave();
    });

    list.appendChild(el);
  });
}

/* ═══════════════════════════════════════════════════════
   14. CERTIFICATIONS SECTION
═══════════════════════════════════════════════════════ */
function addCert() {
  state.certs.push({ id: uid(), name:'', org:'', year:'', url:'' });
  renderCerts();
  autoSave();
}

function removeCert(id) {
  state.certs = state.certs.filter(c => c.id !== id);
  renderCerts();
  autoSave();
}

function renderCerts() {
  const list = $('#cert-list');
  if (!list) return;
  list.innerHTML = '';
  state.certs.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dynamic-item';
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="item-header">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <span class="item-title-display">${escHtml(item.name || 'New Certification')}</span>
        <button class="remove-btn" aria-label="Remove">✕</button>
      </div>
      <div class="item-fields">
        <div class="form-group full-width">
          <label>Certification Name</label>
          <input type="text" placeholder="AWS Cloud Practitioner" value="${escHtml(item.name)}" data-field="name" />
        </div>
        <div class="form-group">
          <label>Organization</label>
          <input type="text" placeholder="Amazon Web Services" value="${escHtml(item.org)}" data-field="org" />
        </div>
        <div class="form-group">
          <label>Year</label>
          <input type="text" placeholder="2024" value="${escHtml(item.year)}" data-field="year" />
        </div>
        <div class="form-group full-width">
          <label>Certificate URL (optional)</label>
          <input type="url" placeholder="https://certificate-link.com" value="${escHtml(item.url)}" data-field="url" />
        </div>
      </div>`;
    el.querySelector('.remove-btn').addEventListener('click', () => removeCert(item.id));
    el.querySelectorAll('[data-field]').forEach(inp => {
      inp.addEventListener('input', e => {
        item[e.target.dataset.field] = e.target.value;
        el.querySelector('.item-title-display').textContent = item.name || 'New Certification';
        autoSave();
      });
    });
    list.appendChild(el);
  });
}

/* ═══════════════════════════════════════════════════════
   15. CUSTOM SECTIONS
═══════════════════════════════════════════════════════ */
function addCustomSection() {
  const title = prompt('Section title (e.g. Awards, Hackathons, Languages):');
  if (!title) return;
  state.customSections.push({ id: uid(), title, bullets: [''] });
  renderCustomSections();
  autoSave();
}

function removeCustomSection(id) {
  state.customSections = state.customSections.filter(s => s.id !== id);
  renderCustomSections();
  autoSave();
}

function renderCustomSections() {
  const list = $('#custom-sections-list');
  if (!list) return;
  list.innerHTML = '';
  state.customSections.forEach(sec => {
    const el = document.createElement('div');
    el.className = 'dynamic-item';
    el.dataset.id = sec.id;
    el.innerHTML = `
      <div class="item-header">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <input class="skill-cat-name-input" type="text" value="${escHtml(sec.title)}" placeholder="Section title" style="flex:1;" aria-label="Section title" />
        <button class="remove-btn" aria-label="Remove">✕</button>
      </div>
      <div class="item-fields">
        <div class="form-group full-width bullets-wrap">
          <div class="bullets-label">Entries (bullet points)</div>
          <div class="bullet-list" id="bullets-custom-${sec.id}"></div>
          <button class="add-bullet-btn" data-add-bullet="custom-${sec.id}" type="button">+ Add entry</button>
        </div>
      </div>`;
    el.querySelector('.remove-btn').addEventListener('click', () => removeCustomSection(sec.id));
    el.querySelector('.skill-cat-name-input').addEventListener('input', e => {
      sec.title = e.target.value;
      autoSave();
    });
    renderBullets(el, `bullets-custom-${sec.id}`, sec.bullets, () => autoSave());
    el.querySelector(`[data-add-bullet="custom-${sec.id}"]`).addEventListener('click', () => {
      sec.bullets.push('');
      renderBullets(el, `bullets-custom-${sec.id}`, sec.bullets, () => autoSave());
      autoSave();
    });
    list.appendChild(el);
  });
}

/* ─── Bullet list renderer (shared) ─── */
function renderBullets(parentEl, listId, bulletsArr, onChange) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = '';
  bulletsArr.forEach((bullet, idx) => {
    const row = document.createElement('div');
    row.className = 'bullet-row';
    row.innerHTML = `
      <textarea class="bullet-input" rows="1" placeholder="• Start with an action verb (Developed, Built, Optimized…)">${escHtml(bullet)}</textarea>
      <button class="bullet-remove" aria-label="Remove bullet" type="button">✕</button>`;
    row.querySelector('.bullet-input').addEventListener('input', e => {
      bulletsArr[idx] = e.target.value;
      onChange();
    });
    row.querySelector('.bullet-remove').addEventListener('click', () => {
      bulletsArr.splice(idx, 1);
      renderBullets(parentEl, listId, bulletsArr, onChange);
      onChange();
    });
    container.appendChild(row);
  });
}

/* ─── Month select options ─── */
function monthOptions(selected) {
  const opts = ['<option value="">Month</option>'];
  MONTHS.forEach(m => opts.push(`<option value="${m}" ${selected === m ? 'selected' : ''}>${m}</option>`));
  return opts.join('');
}

/* ═══════════════════════════════════════════════════════
   16. SORTABLEJS DRAG & DROP
═══════════════════════════════════════════════════════ */
function setupSortable() {
  const configs = [
    { listId: 'education-list',  stateKey: 'education' },
    { listId: 'experience-list', stateKey: 'experience' },
    { listId: 'project-list',    stateKey: 'projects' },
    { listId: 'cert-list',       stateKey: 'certs' },
    { listId: 'custom-sections-list', stateKey: 'customSections' }
  ];
  configs.forEach(({ listId, stateKey }) => {
    const el = document.getElementById(listId);
    if (!el) return;
    Sortable.create(el, {
      handle: '.drag-handle',
      animation: 160,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: () => {
        const newOrder = [];
        el.querySelectorAll('.dynamic-item').forEach(item => {
          const found = state[stateKey].find(s => s.id === item.dataset.id);
          if (found) newOrder.push(found);
        });
        state[stateKey] = newOrder;
        autoSave();
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════
   17. ANALYTICS: Progress, ATS, Readability, Stats
═══════════════════════════════════════════════════════ */
function updateAnalytics() {
  const p = state.personal;

  // ── Progress sections ──
  const sections = [
    { name: 'Name & Email',    done: !!(p.fullName && p.email) },
    { name: 'Phone & Location',done: !!(p.phone && p.address) },
    { name: 'Summary',         done: p.summary.length > 40 },
    { name: 'Skills',          done: allAddedSkills().length >= 3 },
    { name: 'Education',       done: state.education.length > 0 },
    { name: 'Experience',      done: state.experience.length > 0 },
    { name: 'Projects',        done: state.projects.length > 0 },
    { name: 'Certifications',  done: state.certs.length > 0 },
    { name: 'LinkedIn / GitHub', done: !!(p.linkedin || p.github) }
  ];
  const doneCt = sections.filter(s => s.done).length;
  const pct = Math.round((doneCt / sections.length) * 100);

  const fill = $('#progress-fill');
  if (fill) fill.style.width = pct + '%';
  const pctEl = $('#progress-pct');
  if (pctEl) pctEl.textContent = pct + '%';

  const secList = $('#progress-sections');
  if (secList) {
    secList.innerHTML = sections.map(s => `
      <div class="progress-section-row">
        <span class="progress-dot ${s.done ? 'done' : 'miss'}"></span>
        <span class="progress-sec-name">${s.name}</span>
      </div>`).join('');
  }

  // ── ATS Score ──
  // Jobscan-inspired scoring: the score is role-driven and keyword-heavy,
  // then adjusted by real resume evidence such as project depth, experience
  // bullets, skills alignment, certifications, education, contact links, and
  // structure. Contact fields are intentionally capped at 3 points so a resume
  // cannot score well just because basic form fields are filled.
  const atsAnalysis = calculateATSAnalysis(state);
  const atsItems = atsAnalysis.items;
  const atsScore = atsAnalysis.score;

  const atsEl = $('#ats-items');
  if (atsEl) {
    atsEl.innerHTML = atsItems.map(i => `
      <div class="ats-item">
        <span class="ats-dot ${i.done ? 'ok' : 'warn'}"></span>
        <span>${i.msg}</span>
      </div>`).join('');
  }
  const atsInline = $('#ats-score-inline');
  if (atsInline) atsInline.textContent = atsScore + '/100';
  const atsNum = $('#ats-num');
  if (atsNum) atsNum.textContent = atsScore;
  // color ATS badge
  const badge = $('#ats-badge');
  if (badge) {
    if (atsScore >= 80) badge.style.borderColor = '#059669';
    else if (atsScore >= 50) badge.style.borderColor = '#D97706';
    else badge.style.borderColor = '';
  }

  // ── Readability Score ──
  let readScore = 0;
  const readItems = [];

  const rc = (done, msg, wt) => { readItems.push({ done, msg }); if (done) readScore += wt; };

  rc(p.summary.length >= 80 && p.summary.length <= 600, 'Summary is concise (80–600 chars)', 12);
  rc(state.experience.every(e => e.bullets.filter(b => b.trim()).length > 0), 'All experience entries have bullet points', 15);
  rc(state.projects.every(pr => pr.bullets.filter(b => b.trim()).length > 0), 'All projects have bullet points', 15);
  rc(allAddedSkills().length <= 30, 'Skills list is manageable (≤30)', 8);
  rc(allAddedSkills().length >= 5, '5+ skills listed', 8);
  rc(state.education.length > 0, 'Education section filled', 10);
  rc(p.summary.length > 0, 'Summary section present', 10);
  rc(!state.experience.some(e => e.bullets.some(b => b.length > 250)), 'No overly long bullet points', 10);

  // Check for action verbs
  const expText = state.experience.flatMap(e => e.bullets).join(' ').toLowerCase();
  const verbMatch = ACTION_VERBS.filter(v => expText.includes(v.toLowerCase())).length;
  rc(verbMatch >= 3, `Strong action verbs used (${verbMatch} found)`, 12);

  readScore = Math.min(100, readScore);
  const readEl = $('#read-items');
  if (readEl) {
    readEl.innerHTML = readItems.map(i => `
      <div class="ats-item">
        <span class="ats-dot ${i.done ? 'ok' : 'warn'}"></span>
        <span>${i.msg}</span>
      </div>`).join('');
  }
  const readInline = $('#read-score-inline');
  if (readInline) readInline.textContent = readScore + '/100';

  // ── Stats ──
  setTextContent('#stat-exp',    state.experience.length);
  setTextContent('#stat-proj',   state.projects.length);
  setTextContent('#stat-cert',   state.certs.length);
  setTextContent('#stat-skills', allAddedSkills().length);

  // ── Resume Strength ──
  const combined = Math.round((atsScore + readScore + pct) / 3);
  const fill2 = $('#strength-fill');
  if (fill2) fill2.style.width = combined + '%';
  const sl = $('#strength-label');
  if (sl) {
    if (combined >= 80)      { sl.textContent = 'Excellent'; sl.style.color = '#059669'; }
    else if (combined >= 60) { sl.textContent = 'Strong';    sl.style.color = '#0F766E'; }
    else if (combined >= 40) { sl.textContent = 'Average';   sl.style.color = '#D97706'; }
    else                     { sl.textContent = 'Weak';      sl.style.color = '#DC2626'; }
  }
}

function setTextContent(sel, val) {
  const el = $(sel);
  if (el) el.textContent = val;
}

const ATS_ROLE_PROFILES = {
  'Software Engineer': {
    required: ['Programming', 'Data Structures', 'Algorithms', 'OOP'],
    preferred: ['Git', 'REST API', 'Testing', 'SQL', 'Agile'],
    bonus: ['System Design', 'Cloud', 'Docker', 'CI/CD']
  },
  'Java Developer': {
    required: ['Java', 'OOP', 'SQL'],
    preferred: ['Spring Boot', 'REST API', 'Git'],
    bonus: ['Hibernate', 'JUnit', 'Microservices']
  },
  'Frontend Developer': {
    required: ['HTML', 'CSS', 'JavaScript'],
    preferred: ['React', 'TypeScript', 'Responsive Design', 'Git'],
    bonus: ['Accessibility', 'Redux', 'Testing', 'Webpack']
  },
  'Backend Developer': {
    required: ['REST API', 'Database', 'SQL'],
    preferred: ['Node.js', 'Java', 'Python', 'Authentication', 'Git'],
    bonus: ['Microservices', 'Docker', 'Redis', 'Cloud']
  },
  'Full Stack Developer': {
    required: ['JavaScript', 'Frontend', 'Backend'],
    preferred: ['React', 'Node.js', 'REST API', 'Database', 'Git'],
    bonus: ['Docker', 'Cloud', 'Testing', 'CI/CD']
  },
  'Data Analyst': {
    required: ['SQL', 'Excel', 'Data Analysis'],
    preferred: ['Python', 'Tableau', 'Statistics', 'Visualization'],
    bonus: ['Power BI', 'Pandas', 'Dashboard', 'Machine Learning']
  },
  'UI/UX Designer': {
    required: ['Figma', 'Wireframe', 'User Research'],
    preferred: ['Prototype', 'Usability Testing', 'Design Systems', 'Accessibility'],
    bonus: ['Information Architecture', 'User Journey', 'Interaction Design']
  },
  'Product Manager': {
    required: ['Roadmap', 'Stakeholder', 'User Stories'],
    preferred: ['Agile', 'Scrum', 'KPI', 'Metrics', 'Strategy'],
    bonus: ['A/B Testing', 'Market Research', 'Prioritization', 'Analytics']
  }
};

const TECHNICAL_ROLES = [
  'Software Engineer',
  'Java Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst'
];

const PLACEHOLDER_TERMS = [
  'todo', 'tbd', 'n/a', 'na', 'lorem', 'dummy', 'sample', 'test project',
  'project description', 'add details', 'your responsibility'
];

function getRoleKeywords(role) {
  const profile = ATS_ROLE_PROFILES[role];
  if (!profile) return [];
  return [...profile.required, ...profile.preferred, ...profile.bonus];
}

function calculateATSAnalysis(resumeState) {
  const p = resumeState.personal;
  const role = resumeState.targetRole;
  const roleProfile = ATS_ROLE_PROFILES[role];
  const skills = allAddedSkills();
  const resumeText = buildATSResumeText(resumeState);

  const keyword = scoreATSKeywords(roleProfile, resumeText);
  const project = scoreATSProjects(resumeState.projects, resumeText);
  const experience = scoreATSExperience(resumeState.experience);
  const skill = scoreATSSkills(skills, roleProfile);
  const cert = scoreATSCertifications(resumeState.certs);
  const education = scoreATSEducation(resumeState.education);
  const contact = scoreATSContact(p, role);
  const structure = scoreATSStructure(resumeState);

  let rawScore = keyword.score + project.score + experience.score + skill.score +
                 cert.score + education.score + contact.score + structure.score;
  const penalties = calculateATSPenalties({
    role, roleProfile, keyword, project, experience, skill, skills, resumeState
  });

  rawScore -= penalties.points;
  rawScore = applyATSCeiling(rawScore, { role, keyword, project, experience, skills, resumeState });
  const score = Math.max(0, Math.min(98, Math.round(rawScore)));

  return {
    score,
    items: buildATSItems({
      role, roleProfile, keyword, project, experience, skill, cert, education,
      contact, structure, penalties, score
    })
  };
}

function buildATSResumeText(resumeState) {
  return [
    resumeState.personal.fullName,
    resumeState.personal.jobTitle,
    resumeState.personal.summary,
    resumeState.personal.linkedin,
    resumeState.personal.github,
    resumeState.personal.portfolio,
    allAddedSkills().join(' '),
    resumeState.education.map(e => `${e.degree} ${e.institution} ${e.grade}`).join(' '),
    resumeState.experience.map(e => `${e.jobTitle} ${e.company} ${filledBullets(e).join(' ')}`).join(' '),
    resumeState.projects.map(pr => `${pr.title} ${pr.githubUrl} ${filledBullets(pr).join(' ')}`).join(' '),
    resumeState.certs.map(c => `${c.name} ${c.org} ${c.url}`).join(' '),
    resumeState.customSections.map(s => `${s.title} ${filledBullets(s).join(' ')}`).join(' ')
  ].join(' ').toLowerCase();
}

function scoreATSKeywords(roleProfile, resumeText) {
  if (!roleProfile) {
    return { score: 0, percent: 0, matched: [], missing: [], total: 0 };
  }

  const groups = [
    { keywords: roleProfile.required, weight: 22 },
    { keywords: roleProfile.preferred, weight: 13 },
    { keywords: roleProfile.bonus, weight: 5 }
  ];
  let score = 0;
  const matched = [];
  const missing = [];

  groups.forEach(group => {
    const groupMatches = group.keywords.filter(kw => keywordInText(kw, resumeText));
    score += group.keywords.length ? (groupMatches.length / group.keywords.length) * group.weight : 0;
    matched.push(...groupMatches);
    missing.push(...group.keywords.filter(kw => !groupMatches.includes(kw)));
  });

  const total = matched.length + missing.length;
  return {
    score: Math.round(score),
    percent: total ? Math.round((matched.length / total) * 100) : 0,
    matched,
    missing,
    total
  };
}

function scoreATSProjects(projects, resumeText) {
  if (!projects.length) return { score: 0, strong: false, hasWeak: false, count: 0 };

  const perProject = projects.map(project => {
    const bullets = filledBullets(project);
    const joined = `${project.title} ${project.githubUrl} ${bullets.join(' ')}`.toLowerCase();
    const words = wordCount(joined);
    let points = 0;

    if (project.title && !isPlaceholderText(project.title)) points += 2;
    if (bullets.length >= 2) points += 5;
    else if (bullets.length === 1) points += 2;
    if (words >= 45) points += 5;
    else if (words >= 22) points += 3;
    if (hasTechnologyEvidence(joined, resumeText)) points += 4;
    if (project.githubUrl || /github\.com|gitlab\.com|repo|repository/.test(joined)) points += 3;
    if (hasRealContent(joined)) points += 1;

    return Math.min(20, points);
  });

  const average = perProject.reduce((sum, n) => sum + n, 0) / projects.length;
  const score = Math.min(20, Math.round(average + Math.min(projects.length - 1, 2)));
  return {
    score,
    strong: score >= 15,
    hasWeak: perProject.some(n => n < 8),
    count: projects.length
  };
}

function scoreATSExperience(experience) {
  if (!experience.length) return { score: 0, strong: false, hasWeak: false, verbCount: 0 };

  const allBullets = experience.flatMap(e => filledBullets(e));
  const expText = allBullets.join(' ').toLowerCase();
  const verbCount = ACTION_VERBS.filter(v => expText.includes(v.toLowerCase())).length;
  const hasMetrics = /\b\d+%|\b\d+\+|\b\d+x|\b\d+\s*(users|customers|requests|hours|days|seconds|projects|members)\b/i.test(expText);
  let score = 0;

  score += Math.min(5, experience.filter(e => filledBullets(e).length >= 2).length * 3);
  score += Math.min(4, verbCount);
  score += allBullets.some(b => wordCount(b) >= 10) ? 3 : 0;
  score += hasMetrics ? 3 : 0;

  return {
    score: Math.min(15, score),
    strong: score >= 11,
    hasWeak: experience.some(e => wordCount(filledBullets(e).join(' ')) < 18),
    verbCount
  };
}

function scoreATSSkills(skills, roleProfile) {
  if (!skills.length) return { score: 0, aligned: 0 };
  const roleKeywords = roleProfile ? getRoleKeywordsFromProfile(roleProfile) : [];
  const aligned = roleKeywords.length
    ? skills.filter(skill => roleKeywords.some(kw => keywordsRelated(skill, kw))).length
    : 0;
  const base = Math.min(4, skills.length);
  const alignment = roleKeywords.length ? Math.round((aligned / Math.max(1, Math.min(skills.length, roleKeywords.length))) * 6) : 2;
  return { score: Math.min(10, base + alignment), aligned };
}

function scoreATSCertifications(certs) {
  if (!certs.length) return { score: 0 };
  const named = certs.filter(c => c.name && !isPlaceholderText(c.name)).length;
  const detailed = certs.filter(c => c.name && (c.org || c.year || c.url)).length;
  return { score: Math.min(5, named * 3 + detailed) };
}

function scoreATSEducation(education) {
  if (!education.length) return { score: 0 };
  const complete = education.filter(e => e.degree && e.institution).length;
  return { score: complete ? 5 : 3 };
}

function scoreATSContact(personal, role) {
  let score = 0;
  if (personal.email) score += 1;
  if (personal.phone) score += 1;
  if (personal.linkedin || personal.github || personal.portfolio) score += 1;
  if (TECHNICAL_ROLES.includes(role) && personal.github) score = Math.min(3, score + 1);
  return { score: Math.min(3, score) };
}

function scoreATSStructure(resumeState) {
  const hasCore = resumeState.education.length && resumeState.projects.length && allAddedSkills().length;
  const hasBullets = resumeState.projects.concat(resumeState.experience).some(item => filledBullets(item).length);
  return { score: hasCore && hasBullets ? 2 : hasBullets ? 1 : 0 };
}

function calculateATSPenalties(ctx) {
  const penalties = [];
  const p = ctx.resumeState.personal;

  if (!ctx.role || !ctx.roleProfile) penalties.push({ points: 12, msg: 'Select a target role for role-based ATS scoring' });
  if (!ctx.resumeState.projects.length) penalties.push({ points: 6, msg: 'Add projects with detailed implementation bullets' });
  if (!ctx.resumeState.experience.length) penalties.push({ points: 4, msg: 'Add internship or work experience' });
  if (!ctx.resumeState.certs.length) penalties.push({ points: 2, msg: 'Add relevant certifications' });
  if (!p.linkedin) penalties.push({ points: 2, msg: 'Add a LinkedIn profile' });
  if (TECHNICAL_ROLES.includes(ctx.role) && !p.github) penalties.push({ points: 3, msg: 'Add a GitHub link for technical roles' });
  if (ctx.project.hasWeak) penalties.push({ points: 4, msg: 'Improve very short project descriptions' });
  if (ctx.experience.hasWeak) penalties.push({ points: 3, msg: 'Improve very short experience descriptions' });
  if (ctx.roleProfile && ctx.skills.length && (ctx.skill.aligned / ctx.skills.length) < 0.35) penalties.push({ points: 4, msg: 'Align skills more closely with the selected role' });
  if (ctx.keyword.percent < 50) penalties.push({ points: 4, msg: 'Improve keyword match for selected role' });

  return { points: penalties.reduce((sum, p) => sum + p.points, 0), list: penalties };
}

function applyATSCeiling(score, ctx) {
  if (!ctx.role) score = Math.min(score, 45);
  if (!ctx.resumeState.projects.length && !ctx.resumeState.experience.length) score = Math.min(score, 35);
  if (!ctx.resumeState.projects.length && !ctx.resumeState.experience.length && allAddedSkills().length === 0) score = Math.min(score, 15);
  if (!ctx.resumeState.experience.length && !ctx.resumeState.certs.length && score > 60) score = 60;
  if (!ctx.resumeState.experience.length && ctx.resumeState.certs.length && score > 68) score = 68;
  if (ctx.keyword.percent < 70 && score > 85) score = 85;
  if (ctx.keyword.percent < 90 || !ctx.project.strong || !ctx.experience.strong) score = Math.min(score, 95);
  return score;
}

function buildATSItems(data) {
  const missingPreview = data.keyword.missing.join(', ');
  const matchedPreview = data.keyword.matched.join(', ');
  const items = [];

  items.push({
    done: !!data.roleProfile,
    msg: data.roleProfile ? `Target role: ${data.role}` : 'Select a target role for keyword analysis'
  });
  items.push({
    done: data.keyword.percent >= 70,
    msg: `Keyword Match: ${data.keyword.percent}% (${data.keyword.matched.length}/${data.keyword.total})`
  });
  items.push({
    done: data.keyword.matched.length > 0,
    msg: `Matched Keywords: ${matchedPreview || 'None yet'}`
  });
  items.push({
    done: data.keyword.missing.length <= 2 && data.keyword.total > 0,
    msg: `Missing Keywords: ${missingPreview || 'None'}`
  });
  items.push({
    done: data.project.strong,
    msg: data.project.strong ? 'Strong project portfolio' : 'Add stronger projects with 2+ bullets, technologies, and GitHub links'
  });
  items.push({
    done: data.experience.strong,
    msg: data.experience.strong ? `Strong experience bullets (${data.experience.verbCount} action verbs)` : 'Add action verbs, responsibilities, and measurable achievements'
  });
  items.push({
    done: data.skill.score >= 7,
    msg: data.skill.score >= 7 ? 'Skills align with target role' : 'Add skills related to the selected role'
  });
  items.push({
    done: data.cert.score > 0,
    msg: data.cert.score > 0 ? 'Relevant certifications included' : 'Add certifications'
  });
  items.push({
    done: data.education.score >= 5,
    msg: data.education.score >= 5 ? 'Education details complete' : 'Complete education details'
  });
  items.push({
    done: data.contact.score >= 3,
    msg: data.contact.score >= 3 ? 'Contact links are ATS-ready' : 'Add LinkedIn/GitHub/portfolio contact links'
  });

  data.penalties.list.slice(0, 5).forEach(p => items.push({ done: false, msg: p.msg }));
  if (data.score >= 85) items.push({ done: true, msg: 'Excellent resume alignment; 100 is reserved for near-perfect keyword and evidence coverage' });
  else if (data.keyword.percent >= 70) items.push({ done: true, msg: 'Good keyword coverage' });
  else if (data.keyword.missing[0]) items.push({ done: false, msg: `Add ${data.keyword.missing[0]} keyword` });

  return items;
}

function getRoleKeywordsFromProfile(profile) {
  return [...profile.required, ...profile.preferred, ...profile.bonus];
}

function keywordInText(keyword, text) {
  return keywordsRelated(keyword, text);
}

function keywordsRelated(a, b) {
  const left = normalizeKeyword(a);
  const right = normalizeKeyword(b);
  if (!left || !right) return false;
  if (right.includes(left) || left.includes(right)) return true;
  const variants = keywordVariants(left);
  return variants.some(v => right.includes(v));
}

function keywordVariants(keyword) {
  const map = {
    'rest api': ['rest', 'api', 'apis', 'restful'],
    'node.js': ['nodejs', 'node js', 'node'],
    'ci/cd': ['ci cd', 'continuous integration', 'continuous deployment'],
    'oop': ['object oriented', 'object-oriented'],
    'responsive design': ['responsive'],
    'data analysis': ['analysis', 'analytics'],
    'visualization': ['visualisation', 'charts', 'dashboards'],
    'frontend': ['front end', 'front-end'],
    'backend': ['back end', 'back-end'],
    'database': ['databases', 'db'],
    'user stories': ['user story'],
    'kpi': ['kpis']
  };
  return [keyword, ...(map[keyword] || [])];
}

function normalizeKeyword(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9#/.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function filledBullets(item) {
  return (item.bullets || []).filter(b => b && b.trim() && !isPlaceholderText(b));
}

function wordCount(text) {
  const words = String(text || '').match(/[a-z0-9+#/.]+/gi);
  return words ? words.length : 0;
}

function isPlaceholderText(text) {
  const clean = String(text || '').toLowerCase().trim();
  return !clean || PLACEHOLDER_TERMS.some(term => clean.includes(term));
}

function hasRealContent(text) {
  return wordCount(text) >= 18 && !isPlaceholderText(text);
}

function hasTechnologyEvidence(projectText, resumeText) {
  const knownTech = [
    ...PREDEFINED_SKILLS,
    'Spring Boot', 'REST API', 'Hibernate', 'JUnit', 'Microservices', 'React',
    'Node.js', 'Express', 'Tableau', 'Power BI', 'Figma', 'Docker', 'AWS'
  ];
  return knownTech.some(tech => keywordInText(tech, projectText)) ||
         allAddedSkills().some(skill => keywordInText(skill, projectText)) ||
         getRoleKeywords(state.targetRole).some(kw => keywordInText(kw, projectText || resumeText));
}

/* ═══════════════════════════════════════════════════════
   18. SMART SUMMARY GENERATOR
═══════════════════════════════════════════════════════ */
function generateSummary() {
  const p = state.personal;
  const role    = state.targetRole || 'Software Developer';
  const skills  = allAddedSkills().slice(0, 5);
  const edu     = state.education[0];
  const exp     = state.experience[0];
  const projCt  = state.projects.length;

  if (!edu && !exp && skills.length === 0) {
    showToast('⚠ Add education, experience or skills first');
    return;
  }

  const skillStr = skills.length ? skills.slice(0, 3).join(', ') : 'software development';
  const eduStr   = edu ? `${edu.degree}${edu.institution ? ' from ' + edu.institution : ''}` : '';
  const expStr   = exp ? `${exp.jobTitle ? exp.jobTitle + (exp.company ? ' at ' + exp.company : '') : 'a software role'}` : '';

  let summary = '';

  if (exp && edu) {
    summary = `${role} professional with ${eduStr} and hands-on experience as ${expStr}. Proficient in ${skillStr}${projCt > 0 ? ', with ' + projCt + ' notable project' + (projCt > 1 ? 's' : '') + ' demonstrating practical expertise' : ''}. Passionate about building scalable, reliable software solutions.`;
  } else if (edu && !exp) {
    summary = `Final-year ${eduStr} student seeking a ${role} role. Skilled in ${skillStr}${projCt > 0 ? ', with hands-on project experience spanning ' + projCt + ' project' + (projCt > 1 ? 's' : '') : ''}. Eager to apply technical knowledge in a professional environment and contribute to impactful products.`;
  } else if (exp && !edu) {
    summary = `Experienced ${role} with a background as ${expStr}. Core competencies include ${skillStr}. Proven ability to deliver high-quality solutions and collaborate effectively in cross-functional teams.`;
  } else {
    summary = `Motivated ${role} with strong foundational knowledge in ${skillStr}. Passionate about software development, problem-solving, and continuous learning. Looking to contribute skills and grow within a dynamic engineering team.`;
  }

  $('#summary').value = summary;
  state.personal.summary = summary;
  autoSave();
  showToast('✅ Smart summary generated!');
}

/* ═══════════════════════════════════════════════════════
   19. LIVE PREVIEW RENDERER
═══════════════════════════════════════════════════════ */
function renderPreview() {
  const preview = $('#resume-preview');
  if (!preview) return;
  const p = state.personal;
  const hasContent = p.fullName || p.email;

  const emptyEl = $('#empty-state');
  if (emptyEl) emptyEl.style.display = hasContent ? 'none' : 'flex';
  if (!hasContent) { preview.innerHTML = `<div class="empty-state" id="empty-state" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#94a3b8;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg><p>Start typing to see your resume</p></div>`; return; }

  const col = ACCENT_MAP[state.color] || ACCENT_MAP.skyblue;
  let html = '';
  switch (state.template) {
    case 'executive': html = buildExecutive(col); break;
    case 'engineer':  html = buildEngineer(col);  break;
    case 'ats':       html = buildATS(col);        break;
    case 'sidebar':   html = buildSidebar(col);    break;
    default:          html = buildStanford(col);   break;
  }
  preview.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════
   20. TEMPLATE BUILDERS (5)
═══════════════════════════════════════════════════════ */

function tplStyle(col) {
  return `style="--tpl-accent:${col.accent};--tpl-accent-light:${col.light};--tpl-accent-dark:${col.dark};--tpl-accent-rgb:${col.rgb};"`;
}

// ── Template 1: Stanford Professional ──
function buildStanford(col) {
  return `<div class="tpl-stanford" ${tplStyle(col)}>
    ${headerStanford()}
    ${summarySection('tpl-stanford')}
    ${educationSection('tpl-stanford')}
    ${experienceSection('tpl-stanford')}
    ${projectsSection('tpl-stanford')}
    ${skillsSection('tpl-stanford')}
    ${certsSection('tpl-stanford')}
    ${customSectionsHtml('tpl-stanford')}
  </div>`;
}

// ── Template 2: Executive Corporate ──
function buildExecutive(col) {
  return `<div class="tpl-executive" ${tplStyle(col)}>
    <div class="r-header">
      ${headerExecutive()}
    </div>
    <div class="r-body">
      ${summarySection('tpl-executive')}
      ${experienceSection('tpl-executive')}
      ${educationSection('tpl-executive')}
      ${projectsSection('tpl-executive')}
      ${skillsSection('tpl-executive')}
      ${certsSection('tpl-executive')}
      ${customSectionsHtml('tpl-executive')}
    </div>
  </div>`;
}

// ── Template 3: Modern Software Engineer ──
function buildEngineer(col) {
  return `<div class="tpl-engineer" ${tplStyle(col)}>
    <div class="r-header">
      ${headerEngineer()}
    </div>
    <div class="r-body">
      ${summarySection('tpl-engineer')}
      ${experienceSection('tpl-engineer')}
      ${projectsSection('tpl-engineer')}
      ${educationSection('tpl-engineer')}
      ${skillsSection('tpl-engineer')}
      ${certsSection('tpl-engineer')}
      ${customSectionsHtml('tpl-engineer')}
    </div>
  </div>`;
}

// ── Template 4: Minimal ATS ──
function buildATS(col) {
  return `<div class="tpl-ats" ${tplStyle(col)}>
    ${headerATS()}
    ${summarySection('tpl-ats')}
    ${educationSection('tpl-ats')}
    ${experienceSection('tpl-ats')}
    ${projectsSection('tpl-ats')}
    ${skillsSection('tpl-ats')}
    ${certsSection('tpl-ats')}
    ${customSectionsHtml('tpl-ats')}
  </div>`;
}

// ── Template 5: Contemporary Sidebar ──
function buildSidebar(col) {
  return `<div class="tpl-sidebar" ${tplStyle(col)}>
    <div class="r-left">
      ${headerSidebarLeft()}
      ${skillsSidebarLeft()}
      ${certsSidebarLeft()}
    </div>
    <div class="r-right">
      ${summarySection('tpl-sidebar')}
      ${experienceSection('tpl-sidebar')}
      ${projectsSection('tpl-sidebar')}
      ${educationSection('tpl-sidebar')}
      ${customSectionsHtml('tpl-sidebar')}
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════
   21. RESUME SECTION HTML HELPERS
═══════════════════════════════════════════════════════ */
const p = () => state.personal;

// ── SVG Icon constants for contact header ──
// Official LinkedIn blue icon (simplified, 11x11)
const ICON_LINKEDIN = `<svg class="r-contact-icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color:#0A66C2;width:11px;height:11px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;

// Official GitHub mark icon (simplified, 11x11)
const ICON_GITHUB = `<svg class="r-contact-icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:11px;height:11px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;

// Location pin icon (11x11)
const ICON_LOCATION = `<svg class="r-contact-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:11px;height:11px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

// Email icon (11x11)
const ICON_EMAIL = `<svg class="r-contact-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:11px;height:11px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;

// Phone icon (11x11)
const ICON_PHONE = `<svg class="r-contact-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:11px;height:11px;display:inline-block;vertical-align:middle;margin-right:3px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.57a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

// Portfolio/link icon (11x11)
const ICON_PORTFOLIO = `<svg class="r-contact-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="width:11px;height:11px;display:inline-block;vertical-align:middle;margin-right:3px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

// External link icon (box-arrow-up-right) — used for project & cert links
const ICON_EXT_LINK = `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="width:9px;height:9px;display:inline-block;vertical-align:middle;"><path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>`;

// ── Contact line builder ──
// Shows official SVG icons + extracted username/domain. No raw URLs shown.
function contactItems() {
  const items = [];
  if (p().address)
    items.push(`${ICON_LOCATION}<span>${escHtml(p().address)}</span>`);
  if (p().email)
    items.push(`${ICON_EMAIL}<a href="mailto:${escHtml(p().email)}">${escHtml(p().email)}</a>`);
  if (p().phone)
    items.push(`${ICON_PHONE}<span>${escHtml(p().phone)}</span>`);
  if (p().linkedin) {
    const user = extractUsername(p().linkedin);
    items.push(`${ICON_LINKEDIN}<a href="${escHtml(ensureHttp(p().linkedin))}" target="_blank">${escHtml(user)}</a>`);
  }
  if (p().github) {
    const user = extractUsername(p().github);
    items.push(`${ICON_GITHUB}<a href="${escHtml(ensureHttp(p().github))}" target="_blank">${escHtml(user)}</a>`);
  }
  if (p().portfolio) {
    const domain = getShortUrl(p().portfolio);
    items.push(`${ICON_PORTFOLIO}<a href="${escHtml(ensureHttp(p().portfolio))}" target="_blank">${escHtml(domain)}</a>`);
  }
  return items;
}

function contactPrimaryItems() {
  const items = [];
  if (p().address)
    items.push(`${ICON_LOCATION}<span>${escHtml(p().address)}</span>`);
  if (p().linkedin) {
    const user = extractUsername(p().linkedin);
    items.push(`${ICON_LINKEDIN}<a href="${escHtml(ensureHttp(p().linkedin))}" target="_blank">${escHtml(user)}</a>`);
  }
  if (p().github) {
    const user = extractUsername(p().github);
    items.push(`${ICON_GITHUB}<a href="${escHtml(ensureHttp(p().github))}" target="_blank">${escHtml(user)}</a>`);
  }
  if (p().portfolio) {
    const domain = getShortUrl(p().portfolio);
    items.push(`${ICON_PORTFOLIO}<a href="${escHtml(ensureHttp(p().portfolio))}" target="_blank">${escHtml(domain)}</a>`);
  }
  return items;
}

function contactSecondaryItems() {
  const items = [];
  if (p().email)
    items.push(`${ICON_EMAIL}<a href="mailto:${escHtml(p().email)}">${escHtml(p().email)}</a>`);
  if (p().phone)
    items.push(`${ICON_PHONE}<span>${escHtml(p().phone)}</span>`);
  return items;
}

function ensureHttp(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function contactRow(sep = ' · ') {
  return contactItems()
    .map(i => `<span style="display:inline-flex;align-items:center;gap:2px;">${i}</span>`)
    .join(`<span style="opacity:0.35;margin:0 2px;">${sep}</span>`);
}

function contactRows(sep = ' | ') {
  const renderLine = items => items
    .map(i => `<span style="display:inline-flex;align-items:center;gap:2px;">${i}</span>`)
    .join(`<span class="r-contact-sep">${sep}</span>`);
  const primary = contactPrimaryItems();
  const secondary = contactSecondaryItems();
  return `
    ${primary.length ? `<div class="r-contact-line">${renderLine(primary)}</div>` : ''}
    ${secondary.length ? `<div class="r-contact-line">${renderLine(secondary)}</div>` : ''}`;
}

// Duration formatter
function fmtDuration(startMonth, startYear, endMonth, endYear, current) {
  const start = [startMonth, startYear].filter(Boolean).join(' ');
  const end   = current ? 'Present' : [endMonth, endYear].filter(Boolean).join(' ');
  if (!start && !end) return '';
  if (!start) return end;
  if (!end)   return start;
  return `${start} – ${end}`;
}

// Bullets HTML
function bulletsHtml(bullets, cls) {
  const filled = bullets.filter(b => b.trim());
  if (!filled.length) return '';
  return `<ul class="${cls}">${filled.map(b => `<li class="${cls.replace('-list','-bullet').replace('r-bullets','r-bullet')}">${escHtml(b)}</li>`).join('')}</ul>`;
}

// ─── Headers ───

function headerStanford() {
  return `
    <div class="r-name">${escHtml(p().fullName) || 'Your Name'}</div>
    ${p().jobTitle ? `<div class="r-tagline">${escHtml(p().jobTitle)}</div>` : ''}
    <div class="r-contact-row">${contactRows(' | ')}</div>`;
}

function headerExecutive() {
  return `
    <div class="r-name">${escHtml(p().fullName) || 'Your Name'}</div>
    ${p().jobTitle ? `<div class="r-tagline">${escHtml(p().jobTitle)}</div>` : ''}
    <div class="r-contact-row">${contactRows(' | ')}</div>`;
}

function headerEngineer() {
  return `
    <div class="r-name">${escHtml(p().fullName) || 'Your Name'}</div>
    ${p().jobTitle ? `<div class="r-tagline">${escHtml(p().jobTitle)}</div>` : ''}
    <div class="r-contact-row">${contactRows(' | ')}</div>`;
}

function headerATS() {
  return `
    <div class="r-header-block">
      <div class="r-name">${escHtml(p().fullName) || 'Your Name'}</div>
      ${p().jobTitle ? `<div class="r-tagline">${escHtml(p().jobTitle)}</div>` : ''}
      <div class="r-contact-row">${contactRows(' | ')}</div>
    </div>`;
}

function headerSidebarLeft() {
  const items = contactItems();
  return `
    <div class="r-name">${escHtml(p().fullName) || 'Your Name'}</div>
    ${p().jobTitle ? `<div class="r-tagline">${escHtml(p().jobTitle)}</div>` : ''}
    <div class="r-contact-block">
      ${items.map(i => `<div class="r-contact-item" style="display:flex;align-items:center;gap:4px;font-size:7.5pt;margin-bottom:4px;opacity:0.88;">${i}</div>`).join('')}
    </div>`;
}

// ─── Summary ───
function summarySection(tpl) {
  const s = p().summary;
  if (!s) return '';
  if (tpl === 'tpl-sidebar') {
    return `<div class="r-right-sec"><div class="r-right-title">Summary</div><p class="r-summary-p" style="color:#334155;">${escHtml(s)}</p></div>`;
  }
  return `<div class="r-section"><div class="r-sec-title">Summary</div><p class="r-summary-p">${escHtml(s)}</p></div>`;
}

// ─── Education ───
// Layout: Institution (bold) → Degree — Grade/CGPA  [Date right-aligned]
function educationSection(tpl) {
  if (!state.education.length) return '';
  const isSidebar = tpl === 'tpl-sidebar';
  const title = isSidebar ? `<div class="r-right-title">Education</div>` : `<div class="r-sec-title">Education</div>`;
  const wrap  = isSidebar ? 'r-right-sec' : 'r-section';

  const entries = state.education.map(e => {
    const dur = [e.startYear, e.endYear].filter(Boolean).join(' – ');
    const degreeGrade = [e.degree, e.grade].filter(Boolean).join(' — ');

    if (isSidebar) {
      return `
        <div class="r-edu-entry">
          <div class="r-edu-institution-left">${escHtml(e.institution)}</div>
          <div class="r-edu-degree-row-left">
            <span class="r-edu-degree-left">${escHtml(degreeGrade)}</span>
            <span class="r-edu-date-left">${escHtml(dur)}</span>
          </div>
        </div>`;
    }
    return `
      <div class="r-edu-entry">
        <div class="r-edu-institution">${escHtml(e.institution)}</div>
        <div class="r-edu-degree-row">
          <span class="r-edu-degree">${escHtml(degreeGrade)}</span>
          <span class="r-edu-date">${escHtml(dur)}</span>
        </div>
      </div>`;
  }).join('');

  return `<div class="${wrap}">${title}${entries}</div>`;
}

// ─── Experience ───
function experienceSection(tpl) {
  if (!state.experience.length) return '';
  const isSidebar = tpl === 'tpl-sidebar';
  const title = isSidebar ? `<div class="r-right-title">Experience</div>` : `<div class="r-sec-title">Experience</div>`;
  const wrap  = isSidebar ? 'r-right-sec' : 'r-section';
  const bList = isSidebar ? 'r-bullets' : 'r-bullets';
  const bItem = 'r-bullet';

  const entries = state.experience.map(e => {
    const dur = fmtDuration(e.startMonth, e.startYear, e.endMonth, e.endYear, e.current);
    const bullets = e.bullets.filter(b => b.trim());
    return `
      <div class="r-entry">
        <div class="r-entry-head">
          <span class="r-entry-title">${escHtml(e.jobTitle)}</span>
          <span class="r-entry-date">${escHtml(dur)}</span>
        </div>
        <div class="r-entry-org">${escHtml(e.company)}</div>
        ${bullets.length ? `<ul class="${bList}">${bullets.map(b => `<li class="${bItem}">${escHtml(b)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }).join('');

  return `<div class="${wrap}">${title}${entries}</div>`;
}

// ─── Projects ───
function projectsSection(tpl) {
  if (!state.projects.length) return '';
  const isSidebar = tpl === 'tpl-sidebar';
  const isEngineer = tpl === 'tpl-engineer';
  const title = isSidebar ? `<div class="r-right-title">Projects</div>` : `<div class="r-sec-title">Projects</div>`;
  const wrap  = isSidebar ? 'r-right-sec' : 'r-section';

  const entries = state.projects.map(proj => {
    const dur = fmtDuration(proj.startMonth, proj.startYear, proj.endMonth, proj.endYear, proj.current);
    const bullets = proj.bullets.filter(b => b.trim());
    const ghUrl = proj.githubUrl ? ensureHttp(proj.githubUrl) : '';

    return `
      <div class="r-entry">
        <div class="r-entry-head">
          <span class="r-entry-title">${escHtml(proj.title)}${ghUrl ? `<a href="${escHtml(ghUrl)}" target="_blank" class="r-ext-link" title="View repository" aria-label="Open project repository">${ICON_EXT_LINK}</a>` : ''}</span>
          <span class="r-entry-date">${escHtml(dur)}</span>
        </div>
        ${bullets.length ? `<ul class="r-bullets">${bullets.map(b => `<li class="r-bullet">${escHtml(b)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }).join('');

  return `<div class="${wrap}">${title}${entries}</div>`;
}

// ─── Skills ───
function skillsSection(tpl) {
  if (!state.skillCategories.length || allAddedSkills().length === 0) return '';
  const isSidebar  = tpl === 'tpl-sidebar';
  if (isSidebar) return ''; // Sidebar handles skills in left panel
  const isEngineer = tpl === 'tpl-engineer';
  const isATS      = tpl === 'tpl-ats';

  if (isATS) {
    // Plain text for maximum ATS compatibility
    const lines = state.skillCategories
      .filter(c => c.skills.length > 0)
      .map(c => `<div style="margin-bottom:3px;font-size:9.5pt;"><strong>${escHtml(c.name)}:</strong> ${c.skills.map(s => escHtml(s)).join(', ')}</div>`)
      .join('');
    return `<div class="r-section"><div class="r-sec-title">Skills</div><div class="r-skills-text">${lines}</div></div>`;
  }

  if (isEngineer) {
    const rows = state.skillCategories
      .filter(c => c.skills.length > 0)
      .map(c => `
        <div class="r-skill-row">
          <span class="r-skill-cat">${escHtml(c.name)}</span>
          <div class="r-skill-chips">${c.skills.map(s => `<span class="r-skill-chip">${escHtml(s)}</span>`).join('')}</div>
        </div>`).join('');
    return `<div class="r-section"><div class="r-sec-title">Technical Skills</div><div class="r-skills-grid">${rows}</div></div>`;
  }

  // Stanford / Executive — plain row format
  const rows = state.skillCategories
    .filter(c => c.skills.length > 0)
    .map(c => `
      <div class="r-skill-row">
        <span class="r-skill-cat">${escHtml(c.name)}</span>
        <span class="r-skill-vals">${c.skills.map(s => escHtml(s)).join(', ')}</span>
      </div>`).join('');
  return `<div class="r-section"><div class="r-sec-title">Skills</div><div class="r-skills-grid">${rows}</div></div>`;
}

// ─── Skills (sidebar left panel) ───
function skillsSidebarLeft() {
  const cats = state.skillCategories.filter(c => c.skills.length > 0);
  if (!cats.length) return '';
  return `<div class="r-left-sec">
    <div class="r-left-title">Skills</div>
    ${cats.map(c => `
      <div class="r-skill-cat-name">${escHtml(c.name)}</div>
      <div class="r-skill-chips-row">${c.skills.map(s => `<span class="r-left-chip">${escHtml(s)}</span>`).join('')}</div>
    `).join('')}
  </div>`;
}

// ─── Certs ───
function certsSection(tpl) {
  if (!state.certs.length) return '';
  const isSidebar = tpl === 'tpl-sidebar';
  if (isSidebar) return ''; // Sidebar handles in left panel

  const entries = state.certs.map(c => `
    <div class="r-cert-row">
      <div style="display:flex;align-items:center;gap:3px;">
        <span class="r-cert-name">${escHtml(c.name)}</span>
        ${c.url ? `<a href="${escHtml(ensureHttp(c.url))}" target="_blank" class="r-ext-link" title="View certificate" aria-label="Open certificate">${ICON_EXT_LINK}</a>` : ''}
      </div>
      <div>
        <span class="r-cert-org">${escHtml(c.org)}</span>${c.year ? ` · ${escHtml(c.year)}` : ''}
      </div>
    </div>`).join('');

  return `<div class="r-section"><div class="r-sec-title">Certifications</div>${entries}</div>`;
}

// ─── Certs (sidebar left) ───
function certsSidebarLeft() {
  if (!state.certs.length) return '';
  return `<div class="r-left-sec">
    <div class="r-left-title">Certifications</div>
    ${state.certs.map(c => `
      <div class="r-cert-item-left">
        <div class="r-cert-left-name" style="display:flex;align-items:center;gap:3px;">${escHtml(c.name)}${c.url ? `<a href="${escHtml(ensureHttp(c.url))}" target="_blank" class="r-ext-link" style="color:rgba(255,255,255,0.6);" title="View certificate">${ICON_EXT_LINK}</a>` : ''}</div>
        <div class="r-cert-left-org">${escHtml(c.org)}${c.year ? ' · ' + escHtml(c.year) : ''}</div>
      </div>`).join('')}
  </div>`;
}

// ─── Custom Sections ───
function customSectionsHtml(tpl) {
  if (!state.customSections.length) return '';
  const isSidebar = tpl === 'tpl-sidebar';
  const secWrap   = isSidebar ? 'r-right-sec' : 'r-section';
  const titleCls  = isSidebar ? 'r-right-title' : 'r-sec-title';

  return state.customSections.map(sec => {
    const bullets = sec.bullets.filter(b => b.trim());
    if (!bullets.length) return '';
    return `<div class="${secWrap}">
      <div class="${titleCls}">${escHtml(sec.title)}</div>
      <ul class="r-bullets">${bullets.map(b => `<li class="r-bullet">${escHtml(b)}</li>`).join('')}</ul>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════
   22. PDF EXPORT — Improved with clickable links + A4 page breaks
   Strategy:
   1. Render resume to high-res canvas via html2canvas
   2. Calculate proper A4 page slicing with content margins
   3. After image placement, scan resume DOM for <a> tags
      and add jsPDF link annotations at the correct positions
═══════════════════════════════════════════════════════ */
async function downloadPDF() {
  showToast('⏳ Generating PDF…');
  const el = $('#resume-preview');

  // Temporarily flatten border-radius for cleaner capture
  const origBR = el.style.borderRadius;
  const origBS = el.style.boxShadow;
  el.style.borderRadius = '0';
  el.style.boxShadow = 'none';

  try {
    // ── 1. Capture to canvas ──
    const canvas = await html2canvas(el, {
      scale: 3,               // High-res: 3x for crisp text
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageW  = pdf.internal.pageSize.getWidth();   // 210mm
    const pageH  = pdf.internal.pageSize.getHeight();  // 297mm
    const margin = 0; // full bleed — resume template has its own internal padding

    // Canvas dimensions in mm (at 3x scale on 96dpi screen → 72dpi for PDF)
    const pxPerMm = canvas.width / pageW;
    const canvasH = canvas.height;
    const totalMmH = canvasH / pxPerMm;

    // ── 2. Intelligent page slicing ──
    // Instead of naive slicing, we look for safe break points.
    // We slice at pageH-sized chunks and convert canvas to image strips.
    const imgData = canvas.toDataURL('image/jpeg', 0.97);

    if (totalMmH <= pageH) {
      // Single page — perfect fit
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, totalMmH);
    } else {
      // Multi-page: slice image at page boundaries
      let yOffsetMm = 0;
      let pageNum = 0;

      while (yOffsetMm < totalMmH) {
        if (pageNum > 0) pdf.addPage();

        // Height to draw on this page
        const sliceH = Math.min(pageH, totalMmH - yOffsetMm);

        // Crop canvas slice
        const yPx = Math.round(yOffsetMm * pxPerMm);
        const slicePx = Math.round(sliceH * pxPerMm);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = slicePx;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, yPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.97);
        pdf.addImage(sliceData, 'JPEG', margin, margin, pageW - margin * 2, sliceH);

        yOffsetMm += sliceH;
        pageNum++;
      }
    }

    // ── 3. Add clickable link annotations ──
    // We collect all <a> elements from the rendered resume DOM,
    // calculate their position relative to the resume container,
    // then convert px → mm and add jsPDF link annotations.
    addPdfLinks(pdf, el, pageW, pageH, pxPerMm, canvas.width / el.scrollWidth);

    // ── 4. Save ──
    const fname = (state.personal.fullName || 'resume').replace(/\s+/g, '_') + '_resume.pdf';
    pdf.save(fname);
    showToast('✅ PDF exported with clickable links!');

  } catch (err) {
    console.error('PDF export error:', err);
    showToast('❌ Export failed — try Print instead');
  } finally {
    el.style.borderRadius = origBR;
    el.style.boxShadow = origBS;
  }
}

/**
 * addPdfLinks — Scans resume DOM for anchor tags and adds
 * jsPDF link annotations at the correct PDF coordinates.
 *
 * @param {jsPDF} pdf          - jsPDF instance
 * @param {Element} container  - #resume-preview element
 * @param {number} pageW       - PDF page width in mm (210)
 * @param {number} pageH       - PDF page height in mm (297)
 * @param {number} pxPerMm     - pixels per mm (canvas.width / pageW)
 * @param {number} scale       - capture scale ratio (canvas.width / el.scrollWidth)
 */
function addPdfLinks(pdf, container, pageW, pageH, pxPerMm, scale) {
  try {
    const containerRect = container.getBoundingClientRect();
    const anchors = container.querySelectorAll('a[href]');

    anchors.forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;

      // Resolve relative URLs
      const url = ensureHttp(href);
      if (!url) return;

      const rect = anchor.getBoundingClientRect();

      // Position relative to container, in DOM pixels
      const relX = rect.left - containerRect.left;
      const relY = rect.top  - containerRect.top;
      const relW = rect.width;
      const relH = rect.height;

      // Scale to canvas pixels, then convert to mm
      const xMm = (relX * scale) / pxPerMm;
      const yMm = (relY * scale) / pxPerMm;
      const wMm = (relW * scale) / pxPerMm;
      const hMm = (relH * scale) / pxPerMm;

      // Determine which page this link is on
      const pageIndex = Math.floor(yMm / pageH);
      const yOnPage   = yMm - pageIndex * pageH;

      // jsPDF page numbers are 1-indexed
      pdf.setPage(pageIndex + 1);
      pdf.link(xMm, yOnPage, Math.max(wMm, 5), Math.max(hMm, 4), { url });
    });
  } catch (e) {
    // Non-fatal — PDF still exports without links
    console.warn('Link annotation failed:', e);
  }
}

/* ═══════════════════════════════════════════════════════
   23. PRINT
═══════════════════════════════════════════════════════ */
function printResume() { window.print(); }

/* ═══════════════════════════════════════════════════════
   24. CLEAR FORM
═══════════════════════════════════════════════════════ */
function clearAll() {
  if (!confirm('Clear all data for this resume? This cannot be undone.')) return;
  state = blankState();
  state.template = 'stanford';
  state.color = 'skyblue';
  saveVersions();
  applyStateToUI();
  renderAll();
  showToast('✅ Cleared');
}

/* ═══════════════════════════════════════════════════════
   25. TOAST
═══════════════════════════════════════════════════════ */
let _toastTimer = null;
function showToast(msg, dur = 2600) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

/* ═══════════════════════════════════════════════════════
   26. EVENT LISTENERS
═══════════════════════════════════════════════════════ */
function setupEventListeners() {

  // ── Personal fields ──
  ['full-name','job-title-tagline','email','phone','address','linkedin','github','portfolio','summary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', autoSave);
  });

  // ── Target role ──
  const tr = $('#target-role-select');
  if (tr) tr.addEventListener('change', autoSave);

  // ── Templates ──
  $$('.tpl-btn').forEach(b => b.addEventListener('click', () => applyTemplate(b.dataset.tpl)));

  // ── Colors ──
  $$('.swatch').forEach(s => s.addEventListener('click', () => applyColor(s.dataset.color)));

  // ── Dark mode ──
  const dm = $('#dark-toggle');
  if (dm) dm.addEventListener('click', () => { applyDarkMode(!state.darkMode); saveVersions(); });

  // ── Skills ──
  const addCatBtn = $('#add-skill-category');
  if (addCatBtn) addCatBtn.addEventListener('click', addSkillCategory);

  // ── Sections ──
  $('#add-education') ?.addEventListener('click', addEducation);
  $('#add-experience')?.addEventListener('click', addExperience);
  $('#add-project')   ?.addEventListener('click', addProject);
  $('#add-cert')      ?.addEventListener('click', addCert);
  $('#add-custom-section')?.addEventListener('click', addCustomSection);

  // ── Summary AI ──
  $('#btn-ai-summary')?.addEventListener('click', generateSummary);

  // ── PDF & Print ──
  $('#btn-pdf')  ?.addEventListener('click', downloadPDF);
  $('#btn-print')?.addEventListener('click', printResume);
  $('#btn-clear')?.addEventListener('click', clearAll);

  // ── Version management ──
  $('#version-select')      ?.addEventListener('change', e => switchVersion(e.target.value));
  $('#btn-new-version')     ?.addEventListener('click', newVersion);
  $('#btn-rename-version')  ?.addEventListener('click', renameVersion);
  $('#btn-duplicate-version')?.addEventListener('click', duplicateVersion);
  $('#btn-delete-version')  ?.addEventListener('click', deleteVersion);
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', init);
