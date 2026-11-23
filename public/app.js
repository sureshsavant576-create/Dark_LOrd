const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={users:[],departments:[],user:null,view:'discover',equipment:[],bookings:[],projects:[],analytics:null,searchResults:null,filters:{q:'',department:'',category:''}};
const api=async(url,opts={})=>{const r=await fetch(url,{headers:{'Content-Type':'application/json'},...opts});const data=await r.json();if(!r.ok)throw new Error(data.error||'Something went wrong.');return data};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=s=>String(s||'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const datePretty=s=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(s));
const dateTime=s=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(s));
const localISO=(date,hour)=>{const d=new Date();d.setDate(d.getDate()+date);d.setHours(hour,0,0,0);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:00`;};
const iconFor=c=>({'Development boards':'⌁','Test & measurement':'⌗','AI & compute':'▤','Fabrication':'⌘','Sensors & imaging':'◉','Electronics & tools':'⌁'})[c]||'◇';
function toast(message,error=false){const t=document.createElement('div');t.className=`toast ${error?'error':''}`;t.textContent=message;$('#toasts').append(t);setTimeout(()=>t.remove(),3600);}
async function init(){try{const b=await api('/api/bootstrap');state.users=b.users;state.departments=b.departments;const saved=Number(localStorage.getItem('lablink-user'))||1;state.user=state.users.find(u=>u.id===saved)||state.users[0];renderUserOptions();await refresh();render();}catch(e){$('#content').innerHTML=`<div class="empty-state"><strong>LabLink could not connect</strong><p>${esc(e.message)} Check that the local server is running.</p></div>`;}}
function renderUserOptions(){const groups=['student','project_team','faculty','technician','hod','admin'];const labels={student:'Student',project_team:'Project team',faculty:'Faculty',technician:'Lab technician',hod:'HOD / Administrator',admin:'HOD / Administrator'};$('#user-select').innerHTML=groups.map(role=>{const users=state.users.filter(u=>u.role===role);return users.length?`<optgroup label="${labels[role]}">${users.map(u=>`<option value="${u.id}" ${u.id===state.user.id?'selected':''}>${esc(u.name)} · ${esc(u.department)}</option>`).join('')}</optgroup>`:''}).join('');$('#user-avatar').textContent=initials(state.user.name);$('.faculty-nav').classList.toggle('hidden',!['faculty','technician','hod','admin'].includes(state.user.role));$('.admin-nav').classList.toggle('hidden',!['hod','admin'].includes(state.user.role));}
async function refresh(){const [equipment,bookings,projects]=await Promise.all([api('/api/equipment'),api(`/api/bookings?userId=${state.user.id}&role=${state.user.role}`),state.user.role==='student'?api(`/api/projects?userId=${state.user.id}`):Promise.resolve([])]);state.equipment=equipment;state.bookings=bookings;state.projects=projects;$('#request-count').textContent=bookings.filter(b=>b.status==='pending').length;$('#pending-count').textContent=bookings.filter(b=>b.status==='pending').length;}
function setView(view){state.view=view;state.searchResults=null;$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));const labels={discover:'Discover',bookings:state.user.role==='student'?'My requests':'All requests',review:'Review requests',insights:'Resource insights'};$('#breadcrumb-current').textContent=labels[view]||'Discover';$('#sidebar').classList.remove('open');render();}
function render(){if(state.view==='discover')renderDiscover();if(state.view==='bookings')renderBookings();if(state.view==='review')renderReview();if(state.view==='insights')renderInsights();if(state.view==='review'&&['faculty','hod','admin'].includes(state.user.role))$('#content').insertAdjacentHTML('afterbegin','<button class="secondary-button" data-action="export-history">Export review history CSV</button>');}
function stats(){const b=state.bookings;return `<div class="stats-row"><div class="stat-card"><div class="stat-label">Resources across campus <span>◈</span></div><div class="stat-value">${state.equipment.length}<small>in ${state.departments.length} departments</small></div></div><div class="stat-card"><div class="stat-label">My active requests <span>↗</span></div><div class="stat-value">${b.filter(x=>['pending','approved'].includes(x.status)).length}<small>${b.filter(x=>x.status==='pending').length} awaiting review</small></div></div><div class="stat-card"><div class="stat-label">Cross-department access <span>◎</span></div><div class="stat-value">${b.filter(x=>x.equipment_department!==state.user.department).length}<small>requests beyond your department</small></div></div></div>`;}
function equipmentCard(e){
  const equivalent=state.equipment.filter(x=>x.id!==e.id&&(x.equivalent_group&&x.equivalent_group===e.equivalent_group||x.category===e.category));
  const isMatch=state.searchResults?.results?.find(r=>r.id===e.id);
  return `<article class="equipment-card">
    <div class="equipment-top">
      <span class="equip-icon" aria-hidden="true">${iconFor(e.category)}</span>
      <div style="display:flex;gap:5px;align-items:center;">
        ${isMatch ? `<span class="ai-match-badge"><span class="ai-sparkle">✦</span> ${isMatch.match ? (80 + Math.min(18, isMatch.match * 5)) + '% Match' : 'AI Match'}</span>` : ''}
        <span class="badge ${e.availability!=='Available now'?'warn':''}">${esc(e.availability)}</span>
      </div>
    </div>
    <span class="dept-pill">${esc(e.department_code || e.department)} · ${esc(e.location)}</span>
    <h3>${esc(e.name)}</h3>
    <div class="equipment-category">${esc(e.category)} · ${esc(e.department)}</div>
    <p class="equip-description">${esc(e.description)}</p>
    <div class="equip-meta">
      <div>⌖ ${esc(e.location)}</div>
      <div title="${esc(e.specs)}">◫ ${esc(e.specs)}</div>
    </div>
    <div class="equipment-category">${e.available_units}/${e.total_units} units free now · ${esc(e.operational_status)} · max ${e.max_hours}h</div>
    ${e.training_required?'<div class="equipment-category" style="color:#9c6514;font-weight:600;">⚠ Safety training required</div>':''}
    ${e.restrictions?`<div class="equipment-category">Restrictions: ${esc(e.restrictions)}</div>`:''}
    ${equivalent.length?`<div class="equipment-category">Equivalent alternatives: ${equivalent.map(x=>esc(x.name)+' ('+esc(x.department)+')').join(', ')}</div>`:''}
    <div class="tag-list">${e.tags.slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
    <div class="card-bottom">
      <span class="units">${e.total_units} ${e.total_units===1?'unit':'units'}</span>
      ${['technician','admin'].includes(state.user.role)?`<button class="link-button" data-action="equipment-edit" data-id="${e.id}">Update record</button>`:`<button class="link-button" data-action="request" data-id="${e.id}" ${e.operational_status!=='operational'?'disabled':''}>✦ Request Slot (AI Scored) →</button>`}
    </div>
  </article>`;
}
function renderDiscover(){
  const categories=[...new Set(state.equipment.map(e=>e.category))].sort();
  const rows=state.searchResults?.results||state.equipment.filter(e=>(!state.filters.department||String(e.department_id)===state.filters.department)&&(!state.filters.category||e.category===state.filters.category)&&(!state.filters.q||(e.name+' '+e.description+' '+e.tags+' '+e.department).toLowerCase().includes(state.filters.q.toLowerCase())));
  const searchMatrix=state.searchResults?`<div class="ai-matrix-card">
    <div class="ai-matrix-head">
      <div>
        <div class="ai-hero-badge"><span class="ai-sparkle">✦</span> ${esc(state.searchResults.mode)}</div>
        <h2 style="font:700 16px Manrope;margin:4px 0 2px;">AI Requirement Extraction & Capability Match</h2>
        <p style="font-size:11px;color:#59645d;margin:0;">${esc(state.searchResults.interpretation)}</p>
      </div>
      <button class="secondary-button" data-action="clear-search" style="font-size:10px;">✕ Clear AI Match</button>
    </div>
    ${state.searchResults.requirements.length?`<div style="margin:10px 0 6px;"><span class="chips-label">Extracted Technical Requirements & Specs:</span><div class="tag-list" style="margin-top:6px;">${state.searchResults.requirements.slice(0,8).map(t=>`<span class="tag" style="background:#def0e4;color:#18593e;font-weight:700;">✦ ${esc(t)}</span>`).join('')}</div></div>`:''}
  </div>`:'';
  const campusDate=new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short'}).format(new Date());
  $('#content').innerHTML=`
    <div class="page-head">
      <div>
        <div class="eyebrow">GENAI CAMPUS LABORATORY RESOURCE EXCHANGE</div>
        <h1>Intelligent Project-to-Lab Allocation.</h1>
        <p>Match complex capstone project requirements to specialized equipment across departments, resolving scheduling conflicts with transparent, fairness-based arbitration.</p>
      </div>
      <div class="date-label"><span>◷</span>${campusDate} · Campus workspace</div>
    </div>
    
    <div class="ai-hero-card">
      <div class="ai-hero-badge"><span class="ai-sparkle">✦</span> GenAI Resource Matcher & Capability Engine</div>
      <h2>Describe what your project is building</h2>
      <p>Enter your project goals, technical hardware needs, or components. Our AI engine extracts technical requirements, scans cross-department laboratories, and predicts allocation priority.</p>
      <div class="ai-input-wrap">
        <input id="equipment-search" value="${esc(state.filters.q)}" placeholder="Describe your project (e.g. 'We need to train an edge YOLO model on a rover and 3D print its chassis')..." aria-label="Describe project">
        <button class="ai-match-btn" data-action="ai-search">✦ Match With GenAI</button>
      </div>
      <div class="ai-prompt-chips">
        <span class="chips-label">Quick sample project prompts:</span>
        <button class="prompt-chip" data-prompt="Autonomous edge rover with computer vision, object detection, and 3D printed enclosure">🤖 Edge AI Vision Rover</button>
        <button class="prompt-chip" data-prompt="Smart IoT agricultural greenhouse with wireless microcontrollers, telemetry and climate sensors">🌱 IoT Greenhouse Station</button>
        <button class="prompt-chip" data-prompt="High-speed PCB circuit debugging with 100 MHz oscilloscope and precision soldering">⚡ High-Speed PCB Debug</button>
        <button class="prompt-chip" data-prompt="Precision laser cutting and rapid prototyping enclosure">🔬 Rapid Laser Enclosure</button>
      </div>
    </div>

    <div class="fairness-banner">
      <div>
        <strong>⚖️ Active Fairness-Based Scheduling Engine</strong> · 
        <span>Multi-factor optimization active: Deadlines (28%), Access Balance (22%), Dept Equity (16%), Spec Fit (12%)</span>
      </div>
      <button class="text-button" data-action="fairness">View Policy Algorithm ↗</button>
    </div>

    ${stats()}

    <div class="search-panel">
      <span class="search-icon" aria-hidden="true">⌕</span>
      <span style="font-size:11px;font-weight:700;color:#505953;white-space:nowrap;">Manual Filter:</span>
      <select class="filter-select" id="department-filter" aria-label="Filter by department"><option value="">All campus departments</option>${state.departments.map(d=>`<option value="${d.id}" ${String(d.id)===state.filters.department?'selected':''}>${esc(d.name)}</option>`).join('')}</select>
      <select class="filter-select" id="category-filter" aria-label="Filter by category"><option value="">All equipment categories</option>${categories.map(c=>`<option ${c===state.filters.category?'selected':''}>${esc(c)}</option>`).join('')}</select>
      <button class="secondary-button" data-action="reset-filters" style="margin-left:auto;">Reset filters</button>
    </div>

    ${searchMatrix}

    <div class="toolbar">
      <div class="section-title">${state.searchResults?'✦ AI Recommended Resources ('+rows.length+')':'Campus Laboratories & Workstations ('+rows.length+')'}</div>
      <div class="result-count">Across ${state.departments.length} departments</div>
    </div>
    
    <div class="equipment-grid">
      ${rows.length?rows.map(equipmentCard).join(''):`<div class="empty-state"><strong>No matching resources</strong><p>Try clicking one of the sample AI project prompts above or clearing your filters.</p><button class="secondary-button" data-action="reset-filters">Clear filters</button></div>`}
    </div>
  `;

  mountAssistant();$('#equipment-search').addEventListener('input',e=>{state.filters.q=e.target.value;if(!e.target.value){state.searchResults=null;renderDiscover();}});
  $('#equipment-search').addEventListener('keydown',e=>{if(e.key==='Enter'){$('[data-action="ai-search"]')?.click();}});
  $('#department-filter').addEventListener('change',e=>{state.filters.department=e.target.value;renderDiscover();});
  $('#category-filter').addEventListener('change',e=>{state.filters.category=e.target.value;renderDiscover();});
}
function bookingTable(rows,review=false){if(!rows.length)return `<div class="empty-state"><strong>${review?'You’re all caught up.':'No requests yet'}</strong><p>${review?'New student requests will appear here.':'Find equipment that fits your project and request a slot.'}</p>${!review?'<button class="primary-button" data-action="discover">Explore equipment</button>':''}</div>`;return `<div class="table-wrap"><table class="data-table"><thead><tr><th>PROJECT / STUDENT</th><th>EQUIPMENT & DEPARTMENT</th><th>REQUESTED SLOT</th><th>PRIORITY</th><th>STATUS</th>${review?'<th>ACTION</th>':''}</tr></thead><tbody>${rows.map(b=>`<tr><td class="table-primary">${review?`<button class="link-button" data-action="request-details" data-id="${b.id}">${esc(b.student)} · ${esc(b.project)}</button>`:esc(b.project)}<span class="table-sub">${esc(review?`${b.project} · ${b.student_department}`:b.purpose)}</span><span class="table-sub">Deadline · ${datePretty(b.deadline)}</span></td><td class="table-primary">${esc(b.equipment)}<span class="table-sub">${esc(b.equipment_department)}</span></td><td>${dateTime(b.start_at)}<span class="table-sub">until ${dateTime(b.end_at)}</span></td><td><span class="priority">${Math.round(b.priority_score)}/100</span><span class="table-sub" title="${esc(b.fairness_note)}">Fairness score ⓘ</span></td><td><span class="status-pill status-${esc(b.status)}">${esc(b.status)}</span>${b.review_note?`<span class="table-sub">${esc(b.review_note)}</span>`:''}</td>${review?`<td>${b.status==='pending'?`<button class="secondary-button" data-action="request-details" data-id="${b.id}">Review details</button>`:'—'}</td>`:''}</tr>`).join('')}</tbody></table></div>`;}
function renderBookings(){const list=state.bookings.filter(b=>state.user.role!=='student'||b.user_id===state.user.id);$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">REQUEST TRACKER</div><h1>${state.user.role==='student'?'My requests':'Campus requests'}</h1><p>Track booking status, review notes and allocation history.</p></div><button class="primary-button" data-action="discover">＋ Find equipment</button></div>${stats()}<div class="section-bar"><div class="section-title">Booking history <span class="result-count">(${list.length})</span></div><div class="inline-actions"><button class="secondary-button" data-action="export-json">Export JSON</button><button class="secondary-button" data-action="export-csv">Export CSV</button></div></div>${bookingTable(list)}`;}
function renderReview(){const list=state.bookings.filter(b=>b.status==='pending');$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">FACULTY WORKSPACE</div><h1>Review booking requests.</h1><p>Resolve competing requests with project-fit evidence, deadline context, access history, department balance and clear reasons.</p></div><span class="badge ${list.length?'warn':''}">${list.length} awaiting decision</span></div>${stats()}<div class="section-bar"><div class="section-title">Requests needing your review</div><span class="hint">${list.length?'Actions are recorded in the campus audit log':'No pending requests'}</span></div>${bookingTable(list,true)}<div class="section-bar"><div class="section-title">Recently reviewed</div></div>${bookingTable(state.bookings.filter(b=>b.status!=='pending').slice(0,8),true)}`;}
async function renderInsights(){try{state.analytics=await api('/api/analytics');const a=state.analytics,max=Math.max(1,...a.byDepartment.map(x=>x.bookings));$('#content').innerHTML=`<div class="page-head"><div><div class="eyebrow">CAMPUS OVERVIEW</div><h1>Resources in context.</h1><p>Monitor demand across departments and spot opportunities to make idle equipment more accessible.</p></div><span class="badge">Live campus data</span></div><div class="stats-row"><div class="stat-card"><div class="stat-label">Catalogued equipment <span>◈</span></div><div class="stat-value">${a.equipment.length}</div></div><div class="stat-card"><div class="stat-label">Booking requests <span>↗</span></div><div class="stat-value">${a.equipment.reduce((n,x)=>n+x.bookings+x.pending,0)}<small>all time</small></div></div><div class="stat-card"><div class="stat-label">Departments <span>◎</span></div><div class="stat-value">${state.departments.length}<small>sharing resources</small></div></div></div><div class="analytics-grid"><section class="panel"><h3>Demand by department</h3><p class="panel-subtitle">Student requests grouped by home department</p><div class="bar-list">${a.byDepartment.map(d=>`<div class="bar-row"><span>${esc(d.department)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(d.bookings?4:0,d.bookings/max*100)}%"></div></div><strong>${d.bookings}</strong></div>`).join('')}</div></section><section class="panel"><h3>Recent activity</h3><p class="panel-subtitle">Campus request and project log</p>${a.recent.length?a.recent.map(x=>`<div class="activity-item"><strong>${esc(x.actor||'System')}</strong> · ${esc(x.action.replaceAll('_',' '))}<br><span class="table-sub">${dateTime(x.created_at)}</span></div>`).join(''):'<div class="activity-item">No activity yet. Requests will appear here.</div>'}</section></div><div class="section-bar"><div class="section-title">Equipment demand</div><span class="hint">Approved bookings and pending requests</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>EQUIPMENT</th><th>DEPARTMENT</th><th>UNITS</th><th>APPROVED</th><th>PENDING</th><th>UTILISATION</th></tr></thead><tbody>${a.equipment.map(e=>`<tr><td class="table-primary">${esc(e.name)}<span class="table-sub">${esc(e.category)}</span></td><td>${esc(e.department)}</td><td>${e.total_units}</td><td>${e.bookings}</td><td>${e.pending}</td><td class="util-cell"><span class="progress"><span style="width:${Math.min(100,e.bookings*15)}%"></span></span>${Math.min(100,e.bookings*15)}%</td></tr>`).join('')}</tbody></table></div>`;}catch(e){toast(e.message,true);}}
function showFairness(){const d=$('#dialog');d.innerHTML=`<button class="close-modal" data-action="close" aria-label="Close">×</button><div class="modal-head"><div class="eyebrow">HOW REQUESTS ARE PRIORITISED</div><h2>Fairness you can see.</h2><p>A transparent score helps faculty compare requests. It recommends an order; a human reviewer makes the decision.</p></div><div class="fairness-list"><div class="fairness-row"><span>◷</span><div><strong>Project urgency</strong><p>Deadlines approaching within three weeks raise the score, with the strongest weight for projects due soon.</p></div></div><div class="fairness-row"><span>↻</span><div><strong>Recent individual access</strong><p>Students with recent approved access receive less priority, so opportunity is shared over time.</p></div></div><div class="fairness-row"><span>◎</span><div><strong>Department demand</strong><p>Department-level demand is considered; access to equipment in another department stays open.</p></div></div><div class="fairness-row"><span>✓</span><div><strong>Safety stays a constraint</strong><p>Required training must be recorded before a request can be submitted. Scores never override safety or equipment availability.</p></div></div></div><div class="form-actions"><button class="primary-button" data-action="close">Got it</button></div>`;d.showModal();}
function showRequest(id){
  const e=state.equipment.find(x=>x.id===Number(id));if(!e)return;
  if(state.user.role!=='student'){toast('Switch to a student demo profile to request equipment.',true);return;}
  const d=$('#dialog');d.dataset.equipmentId=e.id;
  if(!state.projects.length){
    d.innerHTML='<button class="close-modal" data-action="close" aria-label="Close">×</button><div class="empty-state"><strong>No project to attach</strong><p>Create a project first so the faculty reviewer can understand your requirements.</p><button class="primary-button" data-action="new-project">＋ Create project</button></div>';
  }else{
    const projectOptions=state.projects.map(p=>'<option value="'+p.id+'">'+esc(p.name)+' · due '+datePretty(p.deadline)+'</option>').join('');
    d.innerHTML='<button class="close-modal" data-action="close" aria-label="Close">×</button><div class="modal-head"><div class="eyebrow">INTELLIGENT SLOT REQUEST &amp; FAIRNESS PREVIEW</div><h2>Request '+esc(e.name)+'</h2><p>'+esc(e.department)+' · '+esc(e.location)+(e.training_required?' · ⚠ Verified safety training required':'')+'</p></div><form id="booking-form"><div class="form-grid"><div class="form-field full"><label for="project-select">Your project</label><select id="project-select" required>'+projectOptions+'</select></div><div class="form-field"><label for="start-at">Start time</label><input id="start-at" type="datetime-local" min="'+localISO(0,0)+'" value="'+localISO(1,10)+'" required></div><div class="form-field"><label for="end-at">End time</label><input id="end-at" type="datetime-local" min="'+localISO(0,0)+'" value="'+localISO(1,12)+'" required></div><div class="form-field full"><label for="purpose">How will you use it?</label><textarea id="purpose" minlength="8" maxlength="500" required placeholder="Describe what you need to do with this equipment and how it supports your project..."></textarea><span class="form-help">Fairness algorithm analyzes your deadline urgency, department balance, and access history.</span></div></div><div id="recommendation-slot"></div><div class="form-error" id="form-error"></div><div class="form-actions"><button class="quiet-button" type="button" data-action="close">Cancel</button><button class="primary-button" type="submit">Submit Request for AI Review →</button></div></form>';
    setTimeout(recommendSlot,60);
    $('#start-at')?.addEventListener('change',recommendSlot);
    $('#end-at')?.addEventListener('change',recommendSlot);
    $('#project-select')?.addEventListener('change',recommendSlot);
  }
  d.showModal();$('#booking-form')?.addEventListener('submit',submitBooking);
}
async function recommendSlot(){
  try{
    const data=await api('/api/bookings/recommend',{method:'POST',body:JSON.stringify({userId:state.user.id,projectId:Number($('#project-select').value),equipmentId:Number($('#dialog').dataset.equipmentId),startAt:$('#start-at').value,endAt:$('#end-at').value})});
    const alternatives=data.alternatives.map(a=>'<div class="recommendation-item"><span><strong>'+esc(a.name)+'</strong><small>'+esc(a.department)+' · '+esc(a.location)+'</small></span><span class="match-pill">'+(a.total_units-a.busy)+' units free</span></div>').join('');
    $('#recommendation-slot').innerHTML=`<div class="score-radial"><div><div class="score-number">${data.priorityScore}/100</div><div style="font-size:10px;font-weight:700;color:#18593e;">PREDICTED FAIRNESS PRIORITY</div></div><div style="font-size:11px;color:#47544b;line-height:1.45;">${esc(data.explanation)}</div></div>${alternatives?'<div class="recommendation" style="margin-top:10px;"><h2>Intelligent Fallback Alternatives</h2><p class="hint">In case of slot contention, these equivalent resources are available:</p><div class="recommendation-results">'+alternatives+'</div></div>':''}`;
  }catch(e){
    $('#recommendation-slot').innerHTML=`<div class="form-error" style="background:#fff4f2;padding:8px 12px;border-radius:6px;border:1px solid #fedbd5;">⚠ ${esc(e.message)}</div>`;
  }
}
async function submitBooking(ev){ev.preventDefault();$('#form-error').textContent='';try{const out=await api('/api/bookings',{method:'POST',body:JSON.stringify({userId:state.user.id,equipmentId:Number($('#dialog').dataset.equipmentId),projectId:Number($('#project-select').value),startAt:$('#start-at').value,endAt:$('#end-at').value,purpose:$('#purpose').value})});$('#dialog').close();await refresh();setView('bookings');toast(`Request sent · fairness score ${out.priorityScore}/100`);}catch(e){$('#form-error').textContent=e.message;}}
function showProject(){const d=$('#dialog');d.innerHTML=`<button class="close-modal" data-action="close" aria-label="Close">×</button><div class="modal-head"><div class="eyebrow">PROJECT SETUP</div><h2>Tell us what you’re building.</h2><p>Project details help faculty understand deadlines and make better equipment recommendations.</p></div><form id="project-form"><div class="form-grid"><div class="form-field full"><label for="project-name">Project name</label><input id="project-name" required minlength="3" maxlength="100" placeholder="e.g. Smart greenhouse monitor"></div><div class="form-field full"><label for="project-description">What does your project do?</label><textarea id="project-description" required minlength="10" maxlength="1000" placeholder="Describe your project and the equipment, tools or capabilities it needs..."></textarea></div><div class="form-field"><label for="project-deadline">Submission deadline</label><input id="project-deadline" type="date" min="${new Date().toISOString().slice(0,10)}" required></div></div><div class="form-error" id="project-error"></div><div class="form-actions"><button class="quiet-button" type="button" data-action="close">Cancel</button><button class="primary-button">Create project</button></div></form>`;d.showModal();$('#project-form').addEventListener('submit',async ev=>{ev.preventDefault();try{await api('/api/projects',{method:'POST',body:JSON.stringify({userId:state.user.id,name:$('#project-name').value,description:$('#project-description').value,deadline:$('#project-deadline').value})});$('#dialog').close();await refresh();toast('Project created. Search for equipment that fits.');}catch(e){$('#project-error').textContent=e.message;}});}
async function showFacultyReview(id){
  const b=state.bookings.find(x=>x.id===Number(id));if(!b)return;
  let competing=[];
  try{const q=await api('/api/allocation/recommend',{method:'POST',body:JSON.stringify({reviewerId:state.user.id,equipmentId:b.equipment_id,startAt:b.start_at.slice(0,16),endAt:b.end_at.slice(0,16)})});competing=q.recommendations.filter(x=>x.id!==b.id);}catch{}
  const aiVerdict=(b.priority_score>=70)?`<div class="ai-recommend-box"><strong>✦ AI Allocation Recommendation: APPROVE</strong><p>High fairness score (${Math.round(b.priority_score)}/100). Approaching project deadline (${datePretty(b.deadline)}), strong technical alignment, and balanced access history. Recommended for approval within slot capacity.</p></div>`:`<div class="ai-recommend-box" style="background:#fffaf0;border-color:#f1d69d;"><strong style="color:#8f560e;">✦ AI Allocation Recommendation: REVIEW CAREFULLY</strong><p>Fairness score: ${Math.round(b.priority_score)}/100. Lower urgency or prior student access detected. Faculty discretion advised if competing requests exist.</p></div>`;
  const d=$('#dialog');
  d.innerHTML=`<button class="close-modal" data-action="close" aria-label="Close">×</button><div class="modal-head"><div class="eyebrow">FACULTY REQUEST REVIEW & ARBITRATION</div><h2>${esc(b.project)} · ${esc(b.student)}</h2><p>${esc(b.student_department)} · deadline ${datePretty(b.deadline)}</p></div>${aiVerdict}<section class="panel"><h3>Project brief</h3><p>${esc(b.project_description||'No project description provided.')}</p><h3>Requested resource</h3><p><strong>${esc(b.equipment)}</strong> · ${esc(b.equipment_department)} · ${esc(b.location||'')}<br>${esc(b.equipment_specs||'Specifications unavailable')}</p><p>Training ${b.training_required?'required':'not required'}${b.restrictions?' · Restrictions: '+esc(b.restrictions):''}</p><h3>Requested use</h3><p>${esc(b.purpose)}<br>${dateTime(b.start_at)} – ${dateTime(b.end_at)}</p><h3>Allocation rationale · ${Math.round(b.priority_score)}/100</h3><p>${esc(b.fairness_note)}</p></section><div class="section-bar"><div class="section-title">Competing requests for this slot</div></div>${competing.length?competing.map(x=>`<div class="activity-item"><strong>${esc(x.student)}</strong> · ${esc(x.project)} · ${Math.round(x.score)}/100 · ${x.recommended?'recommended':'queued'}<br>${esc(x.allocation_reason)}</div>`).join(''):'<p class="hint">No other pending request overlaps this slot.</p>'}<div class="form-actions"><button class="danger-button" data-action="reject" data-id="${b.id}">Reject with reason</button><button class="primary-button" data-action="approve" data-id="${b.id}">Approve request</button></div>`;
  d.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="request-details"]');if(b)showFacultyReview(b.dataset.id);});async function review(id,action){const note=action==='reject'?prompt('Rejection reason (required):')||'':'Confirmed';try{await api(`/api/bookings/${id}/${action}`,{method:'POST',body:JSON.stringify({reviewerId:state.user.id,note})});await refresh();render();toast(`Request ${action==='approve'?'approved':'declined'}.`);}catch(e){toast(e.message,true);}}
document.addEventListener('click',async e=>{
  const chip=e.target.closest('.prompt-chip');
  if(chip){
    const p=chip.dataset.prompt;
    const inp=$('#equipment-search');
    if(inp){inp.value=p;state.filters.q=p;}
    try{
      chip.textContent='✦ Matching…';
      state.searchResults=await api('/api/assistant/search',{method:'POST',body:JSON.stringify({query:p})});
      renderDiscover();
    }catch(err){toast(err.message,true);renderDiscover();}
    return;
  }
  const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
  if(a==='discover')setView('discover');
  if(a==='request')showRequest(b.dataset.id);
  if(a==='fairness')showFairness();
  if(a==='close')$('#dialog').close();
  if(a==='new-project')showProject();
  if(a==='approve')review(b.dataset.id,'approve');
  if(a==='reject')review(b.dataset.id,'reject');
  if(a==='ai-search'){
    const q=$('#equipment-search').value.trim();
    if(q.length<2){toast('Describe your project or enter an equipment need first.',true);$('#equipment-search').focus();return;}
    b.disabled=true;b.textContent='✦ Matching with AI…';
    try{state.searchResults=await api('/api/assistant/search',{method:'POST',body:JSON.stringify({query:q})});renderDiscover();}
    catch(err){toast(err.message,true);b.disabled=false;b.textContent='✦ Match With GenAI';}
  }
  if(a==='clear-search'){state.searchResults=null;renderDiscover();}
  if(a==='reset-filters'){state.filters={q:'',department:'',category:''};state.searchResults=null;renderDiscover();}
  if(a==='menu')$('#sidebar').classList.toggle('open');
});
document.addEventListener('click',e=>{const n=e.target.closest('.nav-item[data-view]');if(n)setView(n.dataset.view);});
$('#user-select').addEventListener('change',async e=>{state.user=state.users.find(u=>u.id===Number(e.target.value));localStorage.setItem('lablink-user',state.user.id);renderUserOptions();state.view=['faculty','technician','hod','admin'].includes(state.user.role)?'review':'discover';await refresh();setView(state.view);});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();setView('discover');$('#equipment-search')?.focus();}if(e.key==='Escape')$('#sidebar').classList.remove('open');});
init();
function exportHistory(format){const rows=state.bookings.filter(b=>state.user.role!=='student'||b.user_id===state.user.id).map(b=>({booking_id:b.id,project:b.project,student:b.student||state.user.name,equipment:b.equipment,equipment_department:b.equipment_department,start_at:b.start_at,end_at:b.end_at,status:b.status,priority_score:b.priority_score,review_note:b.review_note||'',created_at:b.created_at}));let content,type,ext;if(format==='json'){content=JSON.stringify({exported_at:new Date().toISOString(),records:rows},null,2);type='application/json';ext='json';}else{const cols=Object.keys(rows[0]||{booking_id:'',project:'',equipment:'',status:''});const cell=v=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};content=[cols.join(','),...rows.map(r=>cols.map(c=>cell(r[c])).join(','))].join('\r\n');type='text/csv';ext='csv';}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=`lablink-booking-history-${new Date().toISOString().slice(0,10)}.${ext}`;a.click();URL.revokeObjectURL(a.href);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="export-json"],[data-action="export-csv"]');if(b)exportHistory(b.dataset.action==='export-json'?'json':'csv');});
function mountAssistant(){const panel=document.createElement('section');panel.className='panel';panel.setAttribute('aria-label','LabLink AI assistant');panel.innerHTML='<h3>Ask LabLink</h3><p class="panel-subtitle">Ask about project requirements, equipment, departments, booking status, or alternatives. Answers use role-authorized campus data.</p><form id="assistant-form" class="search-panel"><input id="assistant-question" aria-label="Ask the LabLink assistant" maxlength="500" placeholder="What equipment fits my project?" required><button class="secondary-button" type="submit">Ask</button></form><div id="assistant-answer" aria-live="polite"></div>';document.querySelector('.search-panel')?.insertAdjacentElement('afterend',panel);panel.querySelector('form').addEventListener('submit',async ev=>{ev.preventDefault();const out=panel.querySelector('#assistant-answer'),question=panel.querySelector('#assistant-question').value;out.textContent='Thinking…';try{const result=await api('/api/assistant/chat',{method:'POST',body:JSON.stringify({userId:state.user.id,question})});out.innerHTML='<p>'+esc(result.answer)+'</p><small class="hint">'+esc(result.mode)+'</small>';}catch(error){out.textContent=error.message;}});}
