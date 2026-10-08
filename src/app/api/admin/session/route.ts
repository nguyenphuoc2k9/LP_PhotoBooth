import { authenticated,createSession,db,hasAdmin,hashPassword,json,limitedJson,localSetup,originAllowed,passwordMatches,sessionCookie,tokenHash } from '@/lib/server-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request){return json({authenticated:authenticated(req),setupRequired:!hasAdmin()&&(localSetup(req)||!!process.env.ADMIN_SETUP_TOKEN),localSetup:localSetup(req)});}
export async function POST(req:Request){
  if(!originAllowed(req))return json({error:'Yêu cầu không hợp lệ.'},403);
  try{
    const body=await limitedJson(req,4096),email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<12||password.length>128)return json({error:'Nhập email hợp lệ và mật khẩu từ 12 đến 128 ký tự.'},400);
    if(body.action==='setup'){
      if(hasAdmin())return json({error:'Tài khoản quản trị đã được thiết lập.'},409);
      if(!localSetup(req)&&(!process.env.ADMIN_SETUP_TOKEN||tokenHash(String(body.setupToken||''))!==tokenHash(process.env.ADMIN_SETUP_TOKEN)))return json({error:'Cần mã thiết lập của máy chủ.'},403);
      db().prepare('INSERT INTO admins(id,email,password) VALUES(1,?,?)').run(email,hashPassword(password));
    }else{
      const attempts=db().prepare('SELECT count,blocked FROM attempts WHERE email=?').get(email);
      if(attempts&&Number(attempts.blocked)>Date.now())return json({error:'Đăng nhập sai nhiều lần. Hãy thử lại sau 15 phút.'},429);
      const user=db().prepare('SELECT email,password FROM admins WHERE id=1').get();
      if(!user||user.email!==email||!passwordMatches(password,String(user.password))){
        const count=attempts&&Number(attempts.blocked)===0?Number(attempts.count)+1:1;
        db().prepare('INSERT INTO attempts(email,count,blocked) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET count=excluded.count,blocked=excluded.blocked').run(email,count,count>=5?Date.now()+900000:0);
        return json({error:'Email hoặc mật khẩu chưa đúng.'},401);
      }
      db().prepare('DELETE FROM attempts WHERE email=?').run(email);
    }
    const token=createSession();return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie(token),'Cache-Control':'no-store'}});
  }catch{return json({error:'Không thể xử lý đăng nhập. Vui lòng thử lại.'},400);}
}
export async function DELETE(req:Request){
  if(!originAllowed(req))return json({error:'Yêu cầu không hợp lệ.'},403);
  const token=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('stillroom_session='))?.slice('stillroom_session='.length);
  if(token)db().prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(token));
  return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie('',0),'Cache-Control':'no-store'}});
}

