import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import {
  getCommercialOverview,
  proposeRule,proposeSeason,proposeRate,
  decideRule,decideSeason,decideRate,
} from "./commercial.service.js";

const router=Router();

// Requiere JWT válido incluso para ver reglas e históricos internos.
router.use(requireAdminAuth);

export function requireApprovalRole(req,res,next) {
  if (req.user?.role!=="admin") return res.status(403).json({
    success:false,
    message:"Solo una persona con rol administrador puede aprobar o rechazar propuestas.",
  });
  next();
}
function handler(fn) {
  return async (req,res,next)=>{
    try { const data=await fn(req); return res.json({success:true,data}); }
    catch(error) { return next(error); }
  };
}
function idFromRequest(req) {
  const n=Number(req.params.id);
  if(!Number.isSafeInteger(n)||n<=0) {
    const error=new Error("Identificador de propuesta inválido.");
    error.statusCode=400;
    throw error;
  }
  return n;
}

router.get("/overview",handler(()=>getCommercialOverview()));

router.post("/rules/:code/proposals",
  handler(req=>proposeRule(req.params.code,req.body,req.user)));
router.post("/rules/proposals/:id/decision",requireApprovalRole,
  handler(req=>decideRule(idFromRequest(req),req.body?.decision,req.user)));

router.post("/seasons",handler(req=>proposeSeason(req.body,req.user)));
router.post("/seasons/:id/decision",requireApprovalRole,
  handler(req=>decideSeason(idFromRequest(req),req.body?.decision,req.user)));

router.post("/rates",handler(req=>proposeRate(req.body,req.user)));
router.post("/rates/:id/decision",requireApprovalRole,
  handler(req=>decideRate(idFromRequest(req),req.body?.decision,req.user)));

export default router;
