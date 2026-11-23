const {db}=require('./db');

function requirementsFor(equipmentId,userId=null){
  const rows=db.prepare(`SELECT r.id,r.equipment_id,r.name,r.description,r.mandatory,r.requires_supervision,r.active,
    c.completed_at,c.verified_by,u.name verifier,c.verification_note
    FROM equipment_training_requirements r
    LEFT JOIN training_completions c ON c.requirement_id=r.id AND c.user_id=?
    LEFT JOIN users u ON u.id=c.verified_by
    WHERE r.equipment_id=? AND r.active=1 ORDER BY r.mandatory DESC,r.id`).all(userId,equipmentId);
  return rows.map(r=>({...r,mandatory:!!r.mandatory,requires_supervision:!!r.requires_supervision,completed:!!r.completed_at}));
}

function eligibilityFor(userId,equipmentId){
  const requirements=requirementsFor(equipmentId,userId);
  const missing=requirements.filter(r=>r.mandatory&&!r.completed);
  const user=db.prepare('SELECT role,study_year FROM users WHERE id=?').get(userId);
  const seniorOnly=requirements.some(r=>r.mandatory)&&user?.role==='student';
  const eligible=seniorOnly?user.study_year>=3:missing.length===0;
  return {eligible,missing,requirements,requiresSupervision:requirements.some(r=>r.requires_supervision),studyYear:user?.study_year??null,seniorOnly,reason:seniorOnly&&!eligible?'Only 3rd- and 4th-year students can access this equipment.':null};
}

module.exports={requirementsFor,eligibilityFor};
