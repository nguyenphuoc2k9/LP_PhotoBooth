import { authenticated,db,json,originAllowed } from '@/lib/server-store';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!originAllowed(req))return json({error:'Yêu cầu không hợp lệ.'},403);
  if(!authenticated(req))return json({error:'Vui lòng đăng nhập.'},401);
  const {id}=await params;const result=db().prepare('DELETE FROM frames WHERE id=?').run(id);
  return result.changes?json({ok:true}):json({error:'Không tìm thấy khung.'},404);
}

